local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local s = import 'cv9040.spec.libsonnet';
local track = import 'track-kit.libsonnet';
local turret = import 'turret-kit.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local paint = { paint: s.paint };
local steel = 'steel-parkerized';
// The upper glacis runs from the nose's tip up to the roof, and the lower glacis from the belly up to the tip.
local tip = [s.nose, s.noseTop];
local lowerGlacis = [2.55, s.belly];
local upperGlacis = [s.glacisTop, s.roofTop];
// Where the upper glacis comes down to the sponsons' shelf.
local glacisAtShelf = s.nose - (s.shelf - s.noseTop) * (s.nose - s.glacisTop) / (s.roofTop - s.noseTop);
local louvre(i) = box('louvre_' + i, 'grille', [0.95 + i * 0.13, s.roofTop, 0.15], [1.03 + i * 0.13, s.roofTop + 0.03, 1.05]);
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'] } }, [
  // The lower hull between the tracks: its belly, floor and side walls.
  k.compound('cv9040_hull_belly', 4300, [
    k.xPrism('belly', 'paint', [[s.belly, -s.wall + 0.12], [s.floor, -s.wall], [s.floor, s.wall], [s.belly, s.wall - 0.12]], [s.rear + 0.08, lowerGlacis[0]]),
    box('deck', 'floor', [s.rear + 0.08, s.floor, -s.wall + 0.05], [lowerGlacis[0], s.floor + 0.02, s.wall - 0.05]),
  ] + bothSides([
    box('lower_wall', 'paint', [s.rear + 0.08, s.floor, s.wall - 0.05], [lowerGlacis[0], s.shelf, s.wall]),
  ]), paint + { floor: 'steel-grey' }),
  // The near side's sponson over the track: its shelf, its upper wall up to the roof, the cheek under the glacis and the
  // skirt hung outside the track's top run.
  k.compound('cv9040_hull_side', 1250, [
    box('shelf', 'paint', [s.rear + 0.08, s.shelf, s.wall], [glacisAtShelf - 0.05, s.shelf + 0.05, s.side]),
    box('wall', 'paint', [s.rear + 0.08, s.shelf + 0.05, s.side - 0.06], [s.glacisTop, s.roof, s.side]),
    prism('cheek', 'paint', [[s.glacisTop, s.shelf], [glacisAtShelf, s.shelf], upperGlacis], [s.side - 0.06, s.side]),
    box('skirt', 'paint', [-2.95, 0.8, s.side], [2.2, s.shelf + 0.05, s.skirt]),
  ], paint),
  // The glacis plates, the nose's cheeks between them and its towing eyes.
  k.compound('cv9040_hull_nose', 2100, [
    k.bar('lower_glacis', 'paint', lowerGlacis, tip, 0.08, [-s.wall, s.wall]),
    k.bar('upper_glacis', 'paint', tip, upperGlacis, 0.08, [-s.side, s.side]),
  ] + bothSides([
    prism('cheek', 'paint', [lowerGlacis, tip, [glacisAtShelf, s.shelf], [lowerGlacis[0], s.shelf]], [s.wall - 0.05, s.wall]),
    box('tow_eye', 'steel', [s.nose - 0.12, 0.72, 0.5], [s.nose - 0.04, 0.84, 0.6]),
  ]), paint + { steel: steel }),
  k.compound('cv9040_hull_roof', 1300, [
    box('plate', 'paint', [s.rear + 0.08, s.roof, -s.side], [s.glacisTop, s.roofTop, s.side]),
  ], paint),
  // The rear plate round the troop door.
  k.compound('cv9040_hull_rear', 600, [
    box('sill', 'paint', [s.rear, s.belly, -0.5], [s.rear + 0.08, 0.65, 0.5]),
    box('header', 'paint', [s.rear, 1.5, -0.5], [s.rear + 0.08, s.roofTop, 0.5]),
  ] + bothSides([
    box('post', 'paint', [s.rear, s.belly, 0.5], [s.rear + 0.08, s.shelf, s.wall]),
    box('sponson_end', 'paint', [s.rear, s.shelf, 0.5], [s.rear + 0.08, s.roofTop, s.side]),
  ]), paint),
  // The troop door, hinged on its near edge.
  k.compound('cv9040_rear_door', 300, [
    box('plate', 'paint', [s.rear - 0.02, 0.65, -0.5], [s.rear + 0.06, 1.5, 0.5]),
    box('handle', 'steel', [s.rear - 0.06, 1.05, -0.4], [s.rear - 0.02, 1.1, -0.25]),
  ] + [
    box('hinge_' + i, 'steel', [s.rear - 0.06, 0.75 + i * 0.55, 0.42], [s.rear - 0.02, 0.85 + i * 0.55, 0.5])
    for i in [0, 1]
  ], paint + { steel: steel }, { hinge_a: ['hinge_0', [0.5, 0.5, 1]], hinge_b: ['hinge_1', [0.5, 0.5, 1]] }),
  k.compound('cv9040_turret_ring', 250, [
    k.turned('ring', 'steel', 'y', k.annulus(0.85, 1.05, 0, 0.05)) + { sides: 24 },
  ], { steel: steel }),
  // A road wheel's trailing torsion-bar arm, near side: the origin is the wheel's axle, the arm runs back and up to its
  // pivot on the hull's wall and its hub end meets the wheel's stub.
  k.compound('cv9040_road_arm', 25, [
    k.bar('arm', 'steel', [0, 0], [-0.35, 0.12], 0.14, [s.wall, s.trackZ - 0.32]),
    k.turned('pivot', 'steel', 'z', k.disc(0.1, s.wall, s.trackZ - 0.32), [-0.35, 0.12, 0]) + { sides: 12 },
  ], { steel: steel }),
  // The engine deck's grille over the engine, beside the driver.
  k.compound('cv9040_engine_deck', 120, [
    box('frame', 'paint', [0.9, s.roofTop, 0.1], [1.8, s.roofTop + 0.02, 1.1]),
  ] + [louvre(i) for i in std.range(0, 6)], paint + { grille: 'plastic-black' }),
  // A folding troop seat against the near wall, facing in: the origin is on the floor under the seat's back.
  k.compound('cv9040_troop_seat', 15, [
    box('cushion', 'cloth', [-0.22, 0.4, -0.42], [0.22, 0.48, -0.04]),
    box('back', 'cloth', [-0.22, 0.48, -0.06], [0.22, 0.98, 0]),
    box('leg', 'steel', [-0.03, 0, -0.36], [0.03, 0.4, -0.3]),
  ], { cloth: 'cloth-seat', steel: 'steel-grey' }),
  // The 40 mm ready rounds below the turret, in clips.
  k.compound('cv9040_ammo_rack', 350, [
    box('rack', 'steel', [-0.3, s.floor, -0.75], [0.2, 1.4, -0.2]),
    box('door', 'paint', [-0.25, 0.65, -0.2], [0.15, 1.35, -0.18]),
  ], paint + { steel: 'steel-grey' }),
  // A fuel tank in the near sponson, over the track.
  k.compound('cv9040_fuel_tank', 90, [
    box('tank', 'paint', [-2.9, s.shelf + 0.05, s.wall + 0.02], [-1.9, s.roof - 0.02, s.side - 0.08]),
    box('filler', 'steel', [-2.5, s.roof - 0.02, 1.2], [-2.4, s.roof, 1.3]),
  ], paint + { steel: steel }),
  // A cross-drive automatic gearbox and steering unit, its output shafts out to the front sprockets: the origin is the
  // centre of the case's base. As the CV9040's Perkins X-300-5; its mass is an estimate.
  k.compound('cross_drive_transmission', 700, [
    box('case', 'casting', [-0.2, 0, -0.45], [0.2, 0.43, 0.45]),
    k.turned('output_shafts', 'shaft', 'z', k.disc(0.08, -s.wall + 0.05, s.wall - 0.05), [0, 0.12, 0]) + { sides: 12 },
  ], { casting: 'steel-grey', shaft: 'steel-spall-black' }),
] + track.classRows('armoured_medium') + track.trackRows('cv9040_track')
  + turret.classRows('two_man_autocannon') + turret.turretRows('cv9040_turret'))
