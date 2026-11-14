// Helpers for a vehicle's placements: which part sits where on the vehicle, in the vehicle frame (frame.libsonnet). A
// part pressed for its vehicle is authored where it sits, so it is placed at the origin.
local frame = import 'frame.libsonnet';
local origin = [0, 0, 0];
// A part that rides another, such as a folding door's free panel on its jamb panel, names the carrier site's id as
// `rides`: its own motion is nested inside its carrier's.
// A part with stowage slots names its load-out as `stowed`, slot id -> item, and may name the site of the closure that
// hides it as `behind`; see docs/decisions/0016-stowage-slots.md.
local one(id, part, at=origin, rides=null, stowed=null, behind=null) = { id: id, part: part, at: at }
  + (if rides == null then {} else { rides: rides })
  + (if stowed == null then {} else { stowed: stowed })
  + (if behind == null then {} else { behind: behind });
// A near-side site and its far-side twin, whose part is reflected across its own centre plane before it is placed. A
// pair that rides or stows behind a closure names the carrier or closure pair by its id, and each twin takes the one
// on its own side; both twins stow the same load-out.
// `0 - z` rather than `-z` keeps a centred twin at 0, since -0 does not survive a JSON round trip.
local pair(id, part, at=origin, rides=null, stowed=null, behind=null) = [
  one(id + side.suffix, part, side.at, if rides == null then null else rides + side.suffix, stowed, if behind == null then null else behind + side.suffix)
  + side.mirror
  for side in [{ suffix: '_near', at: at, mirror: {} }, { suffix: '_far', at: [at[0], at[1], 0 - at[2]], mirror: { mirror: true } }]
];
// A vehicle laid out from another's sites: `over` merges fields into a site by id, `drop` removes sites by id and
// `add` appends sites, so a derived vehicle states only what it changes.
local adjust(sites, over={}, drop=[], add=[]) =
  [placed + std.get(over, placed.id, {}) for placed in sites if !std.member(drop, placed.id)] + add;
// An overlap of the parts at two sites of this vehicle that is correct, with the reason it is, and the depth (m) it may
// reach. The fits every vehicle shares are in `seating.libsonnet`; this is for what only this vehicle does.
local overlap(a, b, depth, why) = { sites: [a, b], depth: depth, why: why };
// An overlap nobody has judged yet, capped at the depth (m) it has now. It does not fail the build and is listed on
// every run until it is fixed or turned into an `overlap` with a reason.
local unjudged(a, b, depth, note) = { sites: [a, b], depth: depth, note: note };
local headlamps(x, y, z) = pair('headlamp', 'car_headlamp', [x, y, z]);
local batteryBay(tray, at) = [one('battery_tray', tray, at), one('battery', 'car_battery', [at[0], at[1] + 0.03, at[2]])];
{
  origin: origin,
  one: one,
  pair: pair,
  adjust: adjust,
  overlap: overlap,
  unjudged: unjudged,
  headlamps: headlamps,
  batteryBay: batteryBay,
  // A game's vehicle kit that emits sites, for the body kits whose `fittings` take one: the fitting list a game's
  // blueprint is built from then gives the placements too, so the two cannot drift. What holds a part on and how it
  // is serviced are gameplay, so those arguments are dropped. `rides` is kept: it is the one place a rider names its
  // carrier, and a game's kit maps it to the support it needs.
  kit: {
    origin: origin,
    fitting(id, part, at, supportedBy=[], service=null, rides=null): one(id, part, at, rides),
    pair(id, part, at, supportedBy=null, service=null, rides=null): pair(id, part, at, rides),
    on(shared=[], paired=[]): null,
    headlamps(x, y, z, supportedBy=[]): headlamps(x, y, z),
    batteryBay(tray, at, supportedBy=[]): batteryBay(tray, at),
  },
  // Every vehicle's placements with each variant's sites laid out from its parent's, and the frame they are laid out
  // in, which tools/placements.mjs turns them from. A variant shares its parent's build, so it names its `parent` and
  // gives `sites` as a function of the parent's sites, stating only what differs. A variant whose parent is unknown or
  // itself a variant keeps no sites, and tools/placements.mjs reports it.
  variants(all):: {
    [vehicle]: { forward: frame.forward } + (
      local entry = all[vehicle];
      if !std.objectHas(entry, 'parent') then entry
      else if std.objectHas(all, entry.parent) && !std.objectHas(all[entry.parent], 'parent')
      then entry { sites: entry.sites(all[entry.parent].sites) }
      else { [key]: entry[key] for key in std.objectFields(entry) if key != 'sites' }
    )
    for vehicle in std.objectFields(all)
  },
}
