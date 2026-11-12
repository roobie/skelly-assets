local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local box = k.box;
local bothSides = k.bothSides;
local s = import 'minivan.spec.libsonnet';
local vehicle = import 'minivan.placements.libsonnet';
local proud = [s.side - 0.02, s.side + 0.03];
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('minivan', vehicle.title, s) + [
  k.compound('minivan_door_track', 6, bothSides([
    box('upper', 'track', [s.rear + 0.2, s.waist - 0.09375, proud[0]], [s.rearDoor, s.waist - 0.03125, proud[1]]),
    box('lower', 'track', [s.rearDoor, s.floor - 0.09375, proud[0]], [s.bRear, s.floor - 0.03125, proud[1]]),
  ]), { track: 'plastic-black' }) + { title: 'Minivan door track' },
])
