// A wheeled sci-fi armoured carrier: a low, slab-sided hull stepped down from its troop casemate to a front deck,
// slung between four very large wheels, its nose a short faceted ogive like a bullet's, entered by a rear ramp, with a
// driver's hood on the deck and a boxy turret on the casemate.
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
  // Flotation tyres nearly as tall as the hull, so it reads as slung between them.
  wheel: { name: wheel, radius: radius, z: 1.36, face: wheels[wheel].rim.face, brake: 'disc' },
  axles: [2.3, -2.0],
  // The air every arch keeps round its tyre.
  archGap: 0.07,
  // The hull's slabs: everything the plates below do not cut away. The casemate stands on the deck from the rear to
  // `step`, so the roof steps down ahead of the turret; both stay low over the tyres' tops.
  body: {
    belly: 0.52,
    deck: 1.76,
    top: 2.0,
    step: 0.6,
    half: 1.55,
    nose: 3.85,
    rear: -3.1,
    // The half-width of the core between the wheels: the arches' inboard wall.
    core: 1.05,
    // A point inside every plate, so each plate's cut keeps the hull's side of it.
    inside: [0, 1.2, 0],
  },
  // The hull's chamfers and nose facets, each plate through three (x, y, z) corners. A plate that leans towards the near
  // side is mirrored onto the far side. The chamfers stay short so flat faces dominate. The nose facets begin ahead of
  // the front arches and turn harder towards the tip, drawing the plan to a bullet's point, and the nose's top and foot
  // are chamfered to a square face.
  plates: {
    shoulder: [[0, 1.88, 1.55], [1, 1.88, 1.55], [0, 2.0, 1.43]],
    chine: [[0, 0.7, 1.55], [1, 0.7, 1.55], [0, 0.52, 1.37]],
    noseFacet1: [[3.2, 0, 1.55], [3.2, 1, 1.55], [3.45, 0, 1.46]],
    noseFacet2: [[3.45, 0, 1.46], [3.45, 1, 1.46], [3.67, 0, 1.22]],
    noseFacet3: [[3.67, 0, 1.22], [3.67, 1, 1.22], [3.85, 0, 0.65]],
    noseTop: [[3.6, 1.76, 0], [3.6, 1.76, 1], [3.85, 1.55, 0]],
    noseFoot: [[3.85, 0.85, 0], [3.85, 0.85, 1], [3.55, 0.52, 0]],
    rearDeck: [[-3.1, 1.88, 0], [-3.1, 1.88, 1], [-2.98, 2.0, 0]],
    rearFloor: [[-3.1, 0.7, 0], [-3.1, 0.7, 1], [-2.92, 0.52, 0]],
    rearCorner: [[-3.1, 0, 1.4], [-3.1, 1, 1.4], [-2.95, 0, 1.55]],
  },
  // The driver's box on the deck, off to the near side of the gun, its visor slit across its sloped front plate.
  hood: {
    x: [1.2, 2.5],
    y: [1.7, 2.15],
    z: [0.15, 1.05],
    plates: { front: [[2.5, 1.9, 0], [2.5, 1.9, 1], [2.3, 2.15, 0]] },
    visor: { y: [2.0, 2.1], z: [0.3, 0.9], depth: 0.015 },
  },
  // A boxy turret on its ring, its front corners and face cut short, with one cannon and a launcher pod on each cheek.
  turret: {
    local t = self,
    x: -1.0,
    ring: { radius: 0.55, height: 0.07 },
    top: 2.4,
    // Its plan as (z, x) corners about its ring's centre, counter-clockwise.
    plan: [[0.6, 0.45], [0.45, 0.65], [-0.45, 0.65], [-0.6, 0.45], [-0.6, -0.6], [0.6, -0.6]],
    plates: { front: [[t.x + 0.65, 2.2, 0], [t.x + 0.65, 2.2, 1], [t.x + 0.5, 2.4, 0]] },
    inside: [t.x, 2.2, 0],
    gunY: 2.25,
    muzzle: 1.9,
    pod: { x: [t.x - 0.5, t.x + 0.3], y: [2.12, 2.38], z: [0.64, 0.88] },
  },
  ramp: { low: 0.84, high: 1.68, half: 0.8 },
  rails: { z: 1.0, from: -2.8, to: 0.4, posts: [-2.6, -1.1, 0.25], height: 0.12, bar: 0.04 },
  pannier: { x: [-0.9, 1.2], y: [0.98, 1.45], z: [1.55, 1.72] },
  hatches: { x: -2.2, z: 0.45 },
  lamps: { y: 1.0, z: 0.45, tailY: 1.35, tailZ: 1.05 },
}
