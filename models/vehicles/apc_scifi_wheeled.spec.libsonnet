// A wheeled sci-fi armoured carrier: a low hull of flat armour plates slung between four very large wheels, its nose
// drawn to a faceted point like a bullet's, entered by a rear ramp, with a driver's hood and one turret on the roof.
// Metres in the vehicle frame (+x forward, +y up, +z near).
local wheels = import 'wheels.libsonnet';
local wheel = 'wheel_18_00r25';
local radius = wheels[wheel].tyre.outer;
{
  local s = self,
  paint: 'paint-fde',
  frame: 'paint-charcoal',
  trim: 'steel-grey',
  grain: 0.02,
  // The kit's largest flotation tyre, so the wheels stand nearly as tall as the hull and it reads as slung between them.
  wheel: { name: wheel, radius: radius, z: 1.36, face: wheels[wheel].rim.face, brake: 'disc' },
  axles: [2.15, -2.05],
  // The air every arch keeps round its tyre.
  archGap: 0.07,
  // The hull's box: everything the plates below do not cut away. Its roof stays low over the tyres' tops.
  body: {
    belly: 0.52,
    top: 2.0,
    half: 1.55,
    nose: 4.45,
    rear: -3.25,
    // The half-width of the core between the wheels: the arches' inboard wall.
    core: 1.05,
    // A point inside every plate, so each plate's cut keeps the hull's side of it.
    inside: [0, 1.2, 0],
  },
  // The hull's sloped armour, each plate through three (x, y, z) corners. A plate that leans towards the near side is
  // mirrored onto the far side. The glacis plates and the cheeks draw the nose to a point in side view and in plan.
  plates: {
    shoulder: [[0, 1.72, 1.55], [1, 1.72, 1.55], [0, 2.0, 1.2]],
    chine: [[0, 0.95, 1.55], [1, 0.95, 1.55], [0, 0.52, 1.12]],
    upperGlacis: [[2.3, 2.0, 0], [2.3, 2.0, 1], [4.45, 1.1, 0]],
    lowerGlacis: [[4.45, 0.98, 0], [4.45, 0.98, 1], [3.35, 0.52, 0]],
    cheek: [[1.6, 0, 1.55], [1.6, 1, 1.55], [4.45, 0, 0.55]],
    rearDeck: [[-3.25, 1.72, 0], [-3.25, 1.72, 1], [-2.95, 2.0, 0]],
    rearFloor: [[-3.25, 0.8, 0], [-3.25, 0.8, 1], [-3.0, 0.52, 0]],
    rearCorner: [[-3.25, 0, 1.28], [-3.25, 1, 1.28], [-2.98, 0, 1.55]],
  },
  // The driver's armoured hood astride the glacis's top edge, a narrow visor across its sloped front.
  hood: {
    x: [1.25, 2.8],
    y: [1.7, 2.22],
    half: 0.55,
    plates: {
      front: [[2.8, 1.8, 0], [2.8, 1.8, 1], [2.3, 2.22, 0]],
      back: [[1.25, 2.0, 0], [1.25, 2.0, 1], [1.45, 2.22, 0]],
      side: [[0, 2.0, 0.55], [1, 2.0, 0.55], [0, 2.22, 0.42]],
    },
    visor: { y: [2.08, 2.17], half: 0.38, depth: 0.015 },
  },
  // A low faceted turret on its ring, pointed ahead in plan, with one cannon and a launcher pod on its near cheek.
  turret: {
    local t = self,
    x: -0.7,
    ring: { radius: 0.62, height: 0.07 },
    top: 2.45,
    // Its plan as (z, x) corners about its ring's centre, counter-clockwise.
    plan: [[0.62, 0.15], [0.3, 0.95], [-0.3, 0.95], [-0.62, 0.15], [-0.55, -0.7], [0.55, -0.7]],
    plates: {
      side: [[0, 2.25, 0.62], [1, 2.25, 0.62], [0, 2.45, 0.44]],
      front: [[t.x + 0.95, 2.22, 0], [t.x + 0.95, 2.22, 1], [t.x + 0.72, 2.45, 0]],
    },
    inside: [t.x, 2.2, 0],
    gunY: 2.32,
    muzzle: 2.1,
    pod: { x: [-1.4, -0.5], y: [2.18, 2.44], z: [0.66, 0.9] },
  },
  ramp: { low: 0.84, high: 1.68, half: 0.8 },
  rails: { z: 1.0, from: -2.8, to: 0.9, posts: [-2.6, -1.1, 0.7], height: 0.12, bar: 0.04 },
  pannier: { x: [-0.95, 1.05], y: [0.98, 1.45], z: [1.55, 1.72] },
  hatches: { x: -2.2, z: 0.45 },
  lamps: { y: 0.72, z: 0.6, tailY: 1.35, tailZ: 1.05 },
}
