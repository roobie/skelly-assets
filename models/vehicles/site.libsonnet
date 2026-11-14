// Helpers for a vehicle's placements: which part sits where on the vehicle, in the vehicle frame (frame.libsonnet). A
// part pressed for its vehicle is authored where it sits, so it is placed at the origin.
local frame = import 'frame.libsonnet';
local origin = [0, 0, 0];
// `rides` names the site of a part that moves, which this one is carried by: a handle on a door, say. It moves with its
// carrier, so the swing check (tools/swingClearance.mjs) tests neither against the other.
local one(id, part, at=origin, rides=null) = { id: id, part: part, at: at } + (if rides == null then {} else { rides: rides });
// A near-side site and its far-side twin, whose part is reflected across its own centre plane before it is placed. A
// twin rides the same-side twin of the site its pair rides. `0 - z` rather than `-z` keeps a centred twin at 0, since
// -0 does not survive a JSON round trip.
local pair(id, part, at=origin, rides=null) = [
  one(id + '_near', part, at, if rides == null then null else rides + '_near'),
  one(id + '_far', part, [at[0], at[1], 0 - at[2]], if rides == null then null else rides + '_far') + { mirror: true },
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
// A contact of the part at `site` with the part at `other` (or `'ground'`) as it opens that is intended, with the reason
// it is and the depth (m) it may reach, such as a door stop or a ramp lip resting on its sill. Contacts the vehicle's
// parts already make at rest are not swing contacts.
local swingContact(site, other, depth, why) = { sites: [site, other], depth: depth, why: why };
// A swing contact nobody has judged yet, capped at the depth (m) it has now. It does not fail the build and is listed on
// every run until the hinge, the stop or the body is fixed or it becomes a `swingContact` with a reason.
local swingUnjudged(site, other, depth, note) = { sites: [site, other], depth: depth, note: note };
local headlamps(x, y, z) = pair('headlamp', 'car_headlamp', [x, y, z]);
local batteryBay(tray, at) = [one('battery_tray', tray, at), one('battery', 'car_battery', [at[0], at[1] + 0.03, at[2]])];
{
  origin: origin,
  one: one,
  pair: pair,
  adjust: adjust,
  overlap: overlap,
  unjudged: unjudged,
  swingContact: swingContact,
  swingUnjudged: swingUnjudged,
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
