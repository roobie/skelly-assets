// Helpers for a vehicle's placements: which part sits where on the vehicle, in the vehicle frame (x forward, y up,
// z toward the near side). A part pressed for its vehicle is authored where it sits, so it is placed at the origin.
local origin = [0, 0, 0];
local one(id, part, at=origin) = { id: id, part: part, at: at };
// A near-side site and its far-side twin, whose part is reflected across its own z = 0 plane before it is placed.
// `0 - z` rather than `-z` keeps a centred twin at 0, since -0 does not survive a JSON round trip.
local pair(id, part, at=origin) = [
  one(id + '_near', part, at),
  one(id + '_far', part, [at[0], at[1], 0 - at[2]]) + { mirror: true },
];
// A vehicle laid out from another's sites: `over` merges fields into a site by id, `drop` removes sites by id and
// `add` appends sites, so a derived vehicle states only what it changes.
local adjust(sites, over={}, drop=[], add=[]) =
  [placed + std.get(over, placed.id, {}) for placed in sites if !std.member(drop, placed.id)] + add;
local headlamps(x, y, z) = pair('headlamp', 'car_headlamp', [x, y, z]);
local batteryBay(tray, at) = [one('battery_tray', tray, at), one('battery', 'car_battery', [at[0], at[1] + 0.03, at[2]])];
{
  origin: origin,
  one: one,
  pair: pair,
  adjust: adjust,
  headlamps: headlamps,
  batteryBay: batteryBay,
  // A game's vehicle kit that emits sites, for the body kits whose `fittings` take one: the fitting list a game's
  // blueprint is built from then gives the placements too, so the two cannot drift. What holds a part on and how it
  // is serviced are gameplay, so those arguments are dropped.
  kit: {
    origin: origin,
    fitting(id, part, at, supportedBy=[], service=null): one(id, part, at),
    pair(id, part, at, supportedBy=null, service=null): pair(id, part, at),
    on(shared=[], paired=[]): null,
    headlamps(x, y, z, supportedBy=[]): headlamps(x, y, z),
    batteryBay(tray, at, supportedBy=[]): batteryBay(tray, at),
  },
  // Every vehicle's placements with each variant's sites laid out from its parent's. A variant shares its parent's
  // build, so it names its `parent` and gives `sites` as a function of the parent's sites, stating only what differs.
  // A variant whose parent is unknown or itself a variant keeps no sites, and tools/placements.mjs reports it.
  variants(all):: {
    [vehicle]: local entry = all[vehicle];
      if !std.objectHas(entry, 'parent') then entry
      else if std.objectHas(all, entry.parent) && !std.objectHas(all[entry.parent], 'parent')
      then entry { sites: entry.sites(all[entry.parent].sites) }
      else { [key]: entry[key] for key in std.objectFields(entry) if key != 'sites' }
    for vehicle in std.objectFields(all)
  },
}
