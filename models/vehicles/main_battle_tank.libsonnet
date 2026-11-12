local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local hull = import 'armoured-hull-kit.libsonnet';
local s = import 'main_battle_tank.spec.libsonnet';
local vehicle = import 'main_battle_tank.placements.libsonnet';
local track = import 'track-kit.libsonnet';
local tracks = import 'tracks.libsonnet';
local turret = import 'turret-kit.libsonnet';
local box = k.box;
local bothSides = k.bothSides;
local paint = { paint: s.paint };
local steel = 'steel-parkerized';
local top = hull.shelfTop(s);
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'] } }, hull.rows(s, vehicle.title) + [
  // The near side's skirt over the track's top run, hung on the sponson's edge: a thick armour panel over the front
  // road wheels, a thinner one behind it and a rubber strip along the bottom.
  k.compound('mbt_side_skirt', 900, [
    box('front_panel', 'paint', [1.6, 0.78, s.side], [3.4, top, s.skirt + 0.06]),
    box('rear_panel', 'paint', [-3.4, 0.82, s.side], [1.6, top, s.skirt]),
    box('strip', 'rubber', [-3.4, 0.72, s.side + 0.01], [1.6, 0.82, s.skirt - 0.01]),
  ], paint + { rubber: 'rubber-black' }) + { title: 'Main battle tank side skirt' },
  // The rear plate between the tracks and across the sponsons, with the engine's exhaust grilles and towing eyes.
  k.compound('mbt_hull_rear', 1400, [
    box('lower_plate', 'paint', [s.rear, s.belly, -s.wall], [s.rear + s.armour.rear, s.shelf, s.wall]),
    box('upper_plate', 'paint', [s.rear, s.shelf, -s.side], [s.rear + s.armour.rear, s.roofTop, s.side]),
  ] + bothSides([
    box('exhaust_grille', 'grille', [s.rear - 0.04, 1.2, 0.2], [s.rear, 1.52, 1.4]),
    box('tow_eye', 'steel', [s.rear - 0.1, 0.7, 0.55], [s.rear, 0.84, 0.67]),
  ]), paint + { grille: 'plastic-black', steel: steel }) + { title: 'Main battle tank hull rear' },
] + track.classRows(tracks[s.track].class) + track.trackRows(s.track)
  + turret.classRows('mbt_120mm') + turret.turretRows(s.turret))
