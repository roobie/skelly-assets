local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local box = k.box;
local s = import 'luxury_saloon.spec.libsonnet';
local vehicle = import 'luxury_saloon.placements.libsonnet';
local nose = s.front - 0.075;
local hoodNose = s.hoodBack - (nose - s.aPost) * s.hoodFall;
local vane = 0.0625;
// A door's bright sill and belt strips, which ride the door they lie on.
local brightwork(door, from, to) = k.compound('luxury_saloon_' + door + '_door_brightwork', 1.5, [
  box('sill', 'bright', [from, 0.4, s.side - 0.02], [to, 0.44, s.side + 0.03]),
  box('belt', 'bright', [from, s.waist - 0.03, s.side - 0.02], [to, s.waist, s.side + 0.03]),
], { bright: 'steel-bright' }) + { title: 'Luxury saloon ' + door + ' door brightwork' };
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('luxury_saloon', vehicle.title, s) + [
  k.compound('luxury_saloon_grille', 9, [
    box('head', 'bright', [nose, hoodNose - 0.03, -0.34], [nose + 0.075, hoodNose + 0.03, 0.34]),
    box('foot', 'bright', [nose, 0.53, -0.34], [nose + 0.075, 0.57, 0.34]),
    box('backing', 'dark', [nose, 0.57, -0.3], [nose + 0.05, hoodNose - 0.03, 0.3]),
    box('mascot', 'bright', [nose + 0.0, hoodNose + 0.03, -0.02], [nose + 0.07, hoodNose + 0.1, 0.02]),
  ] + k.bothSides([
    box('cheek', 'bright', [nose, 0.53, 0.3], [nose + 0.075, hoodNose + 0.03, 0.34]),
  ]) + [
    box('vane_' + i, 'bright', [nose + 0.04, 0.57, -0.3 + 2 * i * vane], [nose + 0.07, hoodNose - 0.03, -0.3 + (2 * i + 1) * vane])
    for i in std.range(0, 4)
  ], { bright: 'steel-bright', dark: 'plastic-black' }) + { title: 'Luxury saloon grille' },
  brightwork('front', s.bFront, s.cowl),
  brightwork('rear', s.rearDoorArch, s.bRear),
])
