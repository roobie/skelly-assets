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
{
  origin: origin,
  one: one,
  pair: pair,
  adjust: adjust,
  headlamps(x, y, z): pair('headlamp', 'car_headlamp', [x, y, z]),
  batteryBay(tray, at): [one('battery_tray', tray, at), one('battery', 'car_battery', [at[0], at[1] + 0.03, at[2]])],
}
