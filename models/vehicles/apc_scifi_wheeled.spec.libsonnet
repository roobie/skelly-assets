// A wheeled sci-fi armoured carrier: a low, slab-sided hollow hull slung between four very large wheels, its long
// glacis raked down to a wedge nose between two fenders like a bullet's point, every face flat and every outer joint
// bevelled. The troops enter by a big rear ramp door or a side door on the near side, between the arches, and sit on
// benches along the walls; the driver sits at the front under the glacis and looks out through a slit in it and through
// periscopes. A boxy weapon station with armoured sights stands on the roof.
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
  axles: [1.95, -2.0],
  // The air every wheel well keeps round its tyre.
  archGap: 0.07,
  // How far each bevel on the hull's outer joints cuts back from the edge across each face it joins.
  chamfer: 0.1,
  body: {
    belly: 0.52,
    top: 2.0,
    half: 1.55,
    rear: -3.1,
    nose: 4.0,
    // The half-width of the hull between the wheels: the wheel wells' inboard wall.
    core: 1.05,
    // The armour's thickness, so the hull is a shell the crew sits inside.
    wall: 0.06,
    // Where the fenders' upright front stands, ahead of the front wells.
    fender: 3.5,
    // A point inside every plate, so each plate's cut keeps the hull's side of it.
    inside: [0, 1.2, 0],
  },
  // The hull's sloped plates, each through three (x, y, z) corners. The glacis rakes from the roof's front edge to the
  // nose; the nose foot rakes back to the belly; the nose cheeks narrow the nose in plan and are mirrored onto the far
  // side; the fender brow slopes each fender's front back to its top.
  plates: {
    glacis: [[0.9, 2.0, 0], [0.9, 2.0, 1], [4.0, 1.05, 0]],
    noseFoot: [[4.0, 1.05, 0], [4.0, 1.05, 1], [3.55, 0.52, 0]],
    noseCheek: [[3.2, 0, 1.05], [3.2, 1, 1.05], [4.0, 0, 0.55]],
    fenderBrow: [[3.5, 1.4, 0], [3.5, 1.4, 1], [3.22, 1.75, 0]],
  },
  // The driver's vision slit across the glacis, at the seated driver's eye line: its fore-and-aft span, half its width
  // and how far its glass sits below the plate's face.
  slit: { x: [1.24, 1.44], half: 0.45, recess: 0.03 },
  // Door openings, each from the floor to `top`: the rear ramp door's half-width, and the side door's span along the
  // near side between the arches, the kerb side, so troops step out away from traffic.
  doors: {
    rear: { half: 0.75, top: 1.9 },
    side: { x: [-0.65, 0.54], top: 1.9 },
  },
  // The troops' benches along the walls, each `length` long from its site, its seat `depth` deep off the wall.
  bench: { length: 1.8, seat: 0.38, depth: 0.42, back: 0.5 },
  benches: { rearX: -2.95, bayX: -1.0 },
  // The driver's seat and controls, centred under the glacis behind the slit.
  driver: { x: [0.62, 1.1], half: 0.25, seat: 0.38 },
  // A stowage locker in the near bay's aft corner and an equipment rack in its fore corner.
  locker: { x: [-1.06, -0.72], z: [1.13, 1.49], top: 1.5 },
  rack: { x: [0.58, 1.0], z: [1.2, 1.49], top: 1.6 },
  // The aisles a crouching soldier walks, each from outside its `door`, straight in through the opening's middle, to
  // standing beside its `seat` site, as (x, z) waypoints on the floor. `tools/test/apc-scifi-wheeled.test.mjs` walks the
  // player's doll along them.
  local sideIn = (s.doors.side.x[0] + s.doors.side.x[1]) / 2,
  local kerb = s.body.half + 0.55,
  local tailgate = s.body.rear - 0.8,
  routes: {
    sideToRearBenches: { door: 'side', seat: 'rear_bench_near', path: [[sideIn, kerb], [sideIn, 0], [-2.4, 0]] },
    sideToBayBench: { door: 'side', seat: 'bay_bench_far', path: [[sideIn, kerb], [sideIn, -0.75]] },
    sideToDriver: { door: 'side', seat: 'driver_seat', path: [[sideIn, kerb], [sideIn, 0.6], [0.86, 0.6]] },
    rearToRearBenches: { door: 'rear', seat: 'rear_bench_far', path: [[tailgate, 0], [-1.6, 0]] },
  },
  // A boxy weapon station on its ring, its front face sloped back, with one cannon and a launcher pod on each cheek.
  turret: {
    local t = self,
    x: -1.0,
    ring: { half: 0.55, height: 0.07 },
    top: 2.4,
    // Its plan as (z, x) corners about its ring's centre, counter-clockwise.
    plan: [[0.6, 0.65], [-0.6, 0.65], [-0.6, -0.6], [0.6, -0.6]],
    plates: { front: [[t.x + 0.65, 2.2, 0], [t.x + 0.65, 2.2, 1], [t.x + 0.45, 2.4, 0]] },
    inside: [t.x, 2.2, 0],
    gunY: 2.25,
    muzzle: 1.9,
    // The cannon elevates about an axis across its mantlet at `trunnion`, and dips `deckDepression` degrees over the
    // hull's deck, which every fitting on the roof stays under, so it can traverse all round.
    trunnion: t.x + 0.6,
    deckDepression: 3,
    pod: { x: [t.x - 0.5, t.x + 0.3], y: [2.12, 2.38], z: [0.64, 0.88] },
  },
  // Armoured optics with dark glass faces. On the turret's roof, about its ring's centre: the gunner's sight box on the
  // far side of the cannon, its glass forward under a hood, and the commander's panoramic head on a mast on the near
  // side, high enough to see over the gunner's box. On the roof, periscope blocks round each hatch, `ring` m from its
  // centre and facing out at `facings` degrees from ahead toward the near side, kept off the turret's side so they stay
  // out of its sweep; and the driver's, behind the glacis, one ahead and one each side turned out by `turn` degrees.
  optics: {
    gunner: { x: [0.1, 0.42], z: [-0.42, -0.18], height: 0.2 },
    commander: { x: -0.3, z: 0.3, mast: 0.22, head: { half: 0.12, height: 0.18 } },
    periscope: { depth: 0.1, width: 0.2, height: 0.08 },
    hatch: { ring: 0.42, facings: [45, 90, 180] },
    driver: { x: 0.78, z: 0.28, turn: 25 },
  },
  // Grab rails along the hull's sides under the eaves, out of the turret's sweep, each from the rear corner to the side
  // door's aft jamb, its bar `standoff` m off the side on posts at `posts`.
  rails: { y: 1.75, from: -2.95, to: -0.8, posts: [-2.8, -1.8, -0.9], standoff: 0.08, bar: 0.04 },
  // A stowage pannier on the far side between the arches, where the near side has its door.
  pannier: { x: [-0.9, 0.85], y: [0.98, 1.45], z: [1.55, 1.72] },
  hatches: { x: -2.2, z: 0.45 },
  lamps: { y: 0.95, z: 1.3, tailY: 1.35, tailZ: 1.15 },
}
