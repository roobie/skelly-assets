local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local s = import 'school_bus.spec.libsonnet';
local vehicle = import 'school_bus.placements.libsonnet';
// How near the rear exit ever comes to the rear wall it swings out of.
local clearance = 0.001;
local doorway = s.rearHoles[0];
local half = doorway.z;
local outer = s.rear - 0.01;
local inner = s.rear + 0.07;
// The rear exit turns on pins outboard of its far edge's outer corner, so it swings out and clear of the wall.
local hingeX = outer - k.grain;
local rearDoorPins = k.hingePins('hinge', 'y', [hingeX, 1.1, -half], [hingeX, 2.3, -half]);
// Its latch edge stands where its inner corner's swing circle passes the clearance inside the near post's nearest corner.
local latchRadius = std.sqrt(std.pow(s.rear - hingeX, 2) + std.pow(2 * half, 2));
local latch = -half + std.sqrt(std.pow(latchRadius - clearance, 2) - std.pow(inner - hingeX, 2));
taxonomy.inherit({ tags: { 'vehicle-body': ['bus'] } }, (import 'bus-body.libsonnet').rows('school_bus', vehicle.title, s) + [
  // The rear exit swings on its far edge, in the centre of the rear wall.
  k.compound('school_bus_rear_door', 42, [
    k.box('skin', 'paint', [outer, doorway.y[0] + clearance, -half], [inner, 1.72, latch]),
    k.box('head', 'paint', [outer, 2.36, -half], [inner, doorway.y[1] - clearance, latch]),
    k.box('stile_far', 'paint', [outer, 1.72, -half], [inner, 2.36, -0.44]),
    k.box('stile_near', 'paint', [outer, 1.72, 0.44], [inner, 2.36, latch]),
    k.box('glass', 'glass', [s.rear + 0.01, 1.72, -0.44], [s.rear + 0.05, 2.36, 0.44]),
    k.box('handle', 'trim', [s.rear - 0.03, 1.56, 0.24], [outer, 1.62, 0.42]),
  ] + rearDoorPins, { paint: s.paint, glass: 'glass-clear', trim: 'plastic-black' }, motion=k.motion.hinge(rearDoorPins, 'rear', s.rearDoorOpens)) + { title: 'School bus rear door' },
  k.compound('school_bus_stop_arm', 3, [
    k.box('arm', 'frame', [-0.03, -0.03, -0.02], [0.2, 0.03, 0.02]),
    k.prism('sign', 'face', [[-0.34, -0.09], [-0.2, -0.23], [-0.06, -0.23], [0.08, -0.09], [0.08, 0.09], [-0.06, 0.23], [-0.2, 0.23], [-0.34, 0.09]], [-0.015, 0.015]),
  ], { frame: 'steel-grey', face: 'plastic-red' }) + { title: 'School bus stop arm' },
])
