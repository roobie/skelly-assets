local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local box = k.box;
local s = import 'electric_crossover.spec.libsonnet';
local vehicle = import 'electric_crossover.placements.libsonnet';
local shape = (import 'car-shape.libsonnet')(s);
local claddingZ = [s.side - 0.01, s.side + 0.02];
local frontCladding = shape.flare('front_flare', 'trim', s.frontAxle, s.sill, claddingZ, 0.05, 0.02);
local rearCladding = shape.flareHalves('rear_flare', 'trim', s.rearAxle, s.sill, claddingZ, 0.05, 0.02, shut=s.rearDoor);
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('electric_crossover', vehicle.title, s) + [
  k.compound('electric_crossover_cladding', 3, frontCladding + rearCladding.aft + [
    box('sill', 'trim', [s.rearAxle + s.arch, s.sill, s.side - 0.01], [s.frontAxle - s.arch, s.floor, s.side + 0.02]),
  ], { trim: 'plastic-black' }) + { title: 'Electric crossover cladding' },
  k.compound('electric_crossover_rear_door_cladding', 0.5, rearCladding.fore, { trim: 'plastic-black' }) + { title: 'Electric crossover rear door cladding' },
])
