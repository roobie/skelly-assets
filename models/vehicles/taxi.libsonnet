local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local box = k.box;
local s = import 'taxi.spec.libsonnet';
local vehicle = import 'taxi.placements.libsonnet';
local signX = -0.35;
local square = 0.125;
// A door's run of chequers, set in from its edges, which rides the door it lies on.
local band(door, from, to) = k.compound('taxi_' + door + '_door_band', 0.5, [
  local x = from + 0.03 + i * square;
  local row = i % 2;
  box('check_' + i, 'band', [x, s.waist - 0.40625 + row * square, s.side - 0.02], [x + square, s.waist - 0.40625 + (row + 1) * square, s.side + 0.03])
  for i in std.range(0, std.floor((to - from - 0.06) / square) - 1)
], { band: 'paint-charcoal' }) + { title: 'Taxi ' + door + ' door band' };
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('taxi', vehicle.title, s) + [
  k.compound('taxi_roof_sign', 3, [
    box('base', 'dark', [signX - 0.2, s.roof + 0.04, -0.3], [signX + 0.2, s.roof + 0.07, 0.3]),
    k.prism('lamp', 'lamp', [[signX - 0.15, s.roof + 0.07], [signX + 0.15, s.roof + 0.07], [signX + 0.1, s.roof + 0.22], [signX - 0.1, s.roof + 0.22]], [-0.27, 0.27]),
  ], { dark: 'plastic-black', lamp: 'plastic-white' }) + { title: 'Taxi roof sign' },
  band('front', s.bFront, s.cowl),
  band('rear', s.rearDoorArch, s.bRear),
])
