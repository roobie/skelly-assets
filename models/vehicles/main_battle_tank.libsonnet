local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local s = import 'main_battle_tank.spec.libsonnet';
local track = import 'track-kit.libsonnet';
local trackClasses = import 'track-classes.libsonnet';
local tracks = import 'tracks.libsonnet';
local turret = import 'turret-kit.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local paint = { paint: s.paint };
local steel = 'steel-parkerized';
local trackClass = tracks.mbt_track.class;
local roadWheel = trackClasses[trackClass].roadWheel;
// The upper glacis runs from the nose's tip up to the roof, and the lower glacis from the belly up to the tip.
local tip = [s.nose, s.noseTop];
local lowerGlacis = [s.lowerGlacisX, s.belly];
local upperGlacis = [s.glacisTop, s.roofTop];
// Where the upper glacis comes down to the sponsons' shelf.
local glacisAtShelf = s.nose - (s.shelf - s.noseTop) * (s.nose - s.glacisTop) / (s.roofTop - s.noseTop);
// A road arm reaches from the hull's wall out to its wheel's hub stub.
local armOut = s.trackZ - roadWheel.width / 2 - roadWheel.hub.stub;
local louvre(i) = box('louvre_' + i, 'grille', [-3.6 + i * 0.16, s.roofTop + 0.02, -1.1], [-3.5 + i * 0.16, s.roofTop + 0.05, 1.1]);
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'] } }, [
  // The lower hull between the tracks: its belly, floor and side walls.
  k.compound('mbt_hull_belly', 7000, [
    k.xPrism('belly', 'paint', [[s.belly, -s.wall + 0.15], [s.floor, -s.wall], [s.floor, s.wall], [s.belly, s.wall - 0.15]], [s.rear + 0.08, lowerGlacis[0]]),
    box('deck', 'floor', [s.rear + 0.08, s.floor, -s.wall + 0.06], [lowerGlacis[0], s.floor + 0.02, s.wall - 0.06]),
  ] + bothSides([
    box('lower_wall', 'paint', [s.rear + 0.08, s.floor, s.wall - 0.06], [lowerGlacis[0], s.shelf, s.wall]),
  ]), paint + { floor: 'steel-grey' }),
  // The near side's sponson over the track: its shelf, its upper wall up to the roof and the cheek under the glacis.
  k.compound('mbt_hull_side', 3200, [
    box('shelf', 'paint', [s.rear + 0.08, s.shelf, s.wall], [glacisAtShelf - 0.06, s.shelf + 0.06, s.side]),
    box('wall', 'paint', [s.rear + 0.08, s.shelf + 0.06, s.side - 0.08], [s.glacisTop, s.roof, s.side]),
    prism('cheek', 'paint', [[s.glacisTop, s.shelf + 0.06], [glacisAtShelf, s.shelf + 0.06], upperGlacis], [s.side - 0.08, s.side]),
  ], paint),
  // The near side's skirt over the track's top run, hung on the sponson's edge: a thick armour panel over the front
  // road wheels, a thinner one behind it and a rubber strip along the bottom.
  k.compound('mbt_side_skirt', 900, [
    box('front_panel', 'paint', [1.6, 0.78, s.side], [3.4, s.shelf + 0.06, s.skirt + 0.06]),
    box('rear_panel', 'paint', [-3.4, 0.82, s.side], [1.6, s.shelf + 0.06, s.skirt]),
    box('strip', 'rubber', [-3.4, 0.72, s.side + 0.01], [1.6, 0.82, s.skirt - 0.01]),
  ], paint + { rubber: 'rubber-black' }),
  // The glacis plates, the nose's cheeks between them and its towing eyes.
  k.compound('mbt_hull_nose', 6000, [
    k.bar('lower_glacis', 'paint', lowerGlacis, tip, 0.15, [-s.wall, s.wall]),
    k.bar('upper_glacis', 'paint', tip, upperGlacis, 0.22, [-s.side, s.side]),
  ] + bothSides([
    prism('cheek', 'paint', [lowerGlacis, tip, [glacisAtShelf, s.shelf], [lowerGlacis[0], s.shelf]], [s.wall - 0.06, s.wall]),
    box('tow_eye', 'steel', [s.nose - 0.14, 0.7, 0.55], [s.nose - 0.04, 0.84, 0.67]),
  ]), paint + { steel: steel }),
  k.compound('mbt_hull_roof', 2200, [
    box('plate', 'paint', [s.rear + 0.08, s.roof, -s.side], [s.glacisTop, s.roofTop, s.side]),
  ], paint),
  // The rear plate between the tracks and across the sponsons, with the engine's exhaust grilles and towing eyes.
  k.compound('mbt_hull_rear', 1400, [
    box('lower_plate', 'paint', [s.rear, s.belly, -s.wall], [s.rear + 0.08, s.shelf, s.wall]),
    box('upper_plate', 'paint', [s.rear, s.shelf, -s.side], [s.rear + 0.08, s.roofTop, s.side]),
  ] + bothSides([
    box('exhaust_grille', 'grille', [s.rear - 0.04, 1.2, 0.2], [s.rear, 1.52, 1.4]),
    box('tow_eye', 'steel', [s.rear - 0.1, 0.7, 0.55], [s.rear, 0.84, 0.67]),
  ]), paint + { grille: 'plastic-black', steel: steel }),
  // The engine deck's grilles over the engine, behind the turret's bustle.
  k.compound('mbt_engine_deck', 600, [
    box('frame', 'paint', [s.rear + 0.15, s.roofTop, -1.2], [-1.3, s.roofTop + 0.02, 1.2]),
  ] + [louvre(i) for i in std.range(0, 13)], paint + { grille: 'plastic-black' }),
  k.compound('mbt_turret_ring', 300, [
    k.turned('ring', 'steel', 'y', k.annulus(1.0, 1.15, 0, 0.05)) + { sides: 32 },
  ], { steel: steel }),
  // A road wheel's trailing torsion-bar arm, near side: the origin is the wheel's axle, the arm runs back and up to its
  // pivot on the hull's wall and its hub end meets the wheel's stub.
  k.compound('mbt_road_arm', 80, [
    k.bar('arm', 'steel', [0, 0], [-0.42, 0.15], 0.17, [s.wall, armOut]),
    k.turned('pivot', 'steel', 'z', k.disc(0.11, s.wall, armOut), [-0.42, 0.15, 0]) + { sides: 12 },
  ], { steel: steel }),
  // A fuel tank in the near sponson ahead of the turret, over the track.
  k.compound('mbt_fuel_tank', 250, [
    box('tank', 'paint', [0.6, s.shelf + 0.06, s.wall + 0.02], [2.1, s.roof - 0.02, s.side - 0.1]),
    box('filler', 'steel', [1.2, s.roof - 0.02, 1.3], [1.3, s.roof, 1.4]),
  ], paint + { steel: steel }),
  // The main gun's ready rounds beside the driver, on the far side of the nose, behind an armoured door.
  k.compound('mbt_hull_ammo_rack', 600, [
    box('rack', 'steel', [1.0, s.floor + 0.02, -s.wall + 0.06], [2.1, 1.45, -0.42]),
    box('door', 'paint', [1.05, 0.7, -0.42], [2.05, 1.4, -0.39]),
  ], paint + { steel: 'steel-grey' }),
  // A cross-drive automatic gearbox and steering unit across the hull's rear, its output shafts out to the drive
  // sprockets: the origin is on the shafts' axis, so the sprockets' axle places it. Its mass is an estimate.
  k.compound('mbt_transmission', 2300, [
    box('case', 'casting', [-0.25, -0.12, -0.62], [0.25, 0.43, 0.62]),
    k.turned('output_shafts', 'shaft', 'z', k.disc(0.09, -s.wall + 0.06, s.wall - 0.06)) + { sides: 12 },
  ], { casting: 'steel-grey', shaft: 'steel-spall-black' }),
] + track.classRows(trackClass) + track.trackRows('mbt_track')
  + turret.classRows('mbt_120mm') + turret.turretRows('mbt_turret'))
