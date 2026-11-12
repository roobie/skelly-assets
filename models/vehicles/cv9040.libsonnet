local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local hull = import 'armoured-hull-kit.libsonnet';
local s = import 'cv9040.spec.libsonnet';
local vehicle = import 'cv9040.placements.libsonnet';
local track = import 'track-kit.libsonnet';
local trackClasses = import 'track-classes.libsonnet';
local tracks = import 'tracks.libsonnet';
local turret = import 'turret-kit.libsonnet';
local box = k.box;
local bothSides = k.bothSides;
local paint = { paint: s.paint };
local steel = 'steel-parkerized';
local plate = s.rear + s.armour.rear;
local trackOuter = s.trackZ + trackClasses[tracks[s.track].class].link.width / 2;
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'] } }, hull.rows(s, vehicle.title) + [
  // The near side's skirt outside the track's top run, hung from the sponson's edge above the track.
  k.compound('cv9040_side_skirt', 250, [
    box('hanger', 'paint', [-2.95, s.shelf, s.side], [2.2, hull.shelfTop(s), trackOuter]),
    box('skirt', 'paint', [-2.95, 0.8, trackOuter], [2.2, hull.shelfTop(s), s.skirt]),
  ], paint) + { title: 'Tracked infantry fighting vehicle side skirt' },
  // The rear plate round the troop door.
  k.compound('cv9040_hull_rear', 600, [
    box('sill', 'paint', [s.rear, s.belly, -0.5], [plate, 0.65, 0.5]),
    box('header', 'paint', [s.rear, 1.5, -0.5], [plate, s.roofTop, 0.5]),
  ] + bothSides([
    box('post', 'paint', [s.rear, s.belly, 0.5], [plate, s.shelf, s.wall]),
    box('sponson_end', 'paint', [s.rear, s.shelf, 0.5], [plate, s.roofTop, s.side]),
  ]), paint) + { title: 'Tracked infantry fighting vehicle hull rear' },
  // The troop door, hinged on its near edge.
  k.compound('cv9040_rear_door', 300, [
    box('plate', 'paint', [s.rear - 0.02, 0.65, -0.5], [s.rear + 0.06, 1.5, 0.5]),
    box('handle', 'steel', [s.rear - 0.06, 1.05, -0.4], [s.rear - 0.02, 1.1, -0.25]),
  ] + [
    box('hinge_' + i, 'steel', [s.rear - 0.06, 0.75 + i * 0.55, 0.42], [s.rear - 0.02, 0.85 + i * 0.55, 0.5])
    for i in [0, 1]
  ], paint + { steel: steel }, { hinge_a: ['hinge_0', [0.5, 0.5, 1]], hinge_b: ['hinge_1', [0.5, 0.5, 1]] }) + { title: 'Tracked infantry fighting vehicle rear door' },
  // A folding troop seat against the near wall, facing in: the origin is on the floor under the seat's back.
  k.compound('cv9040_troop_seat', 15, [
    box('cushion', 'cloth', [-0.22, 0.4, -0.42], [0.22, 0.48, -0.04]),
    box('back', 'cloth', [-0.22, 0.48, -0.06], [0.22, 0.98, 0]),
    box('leg', 'steel', [-0.03, 0, -0.36], [0.03, 0.4, -0.3]),
  ], { cloth: 'cloth-seat', steel: 'steel-grey' }) + { title: 'Tracked infantry fighting vehicle troop seat' },
] + track.classRows(tracks[s.track].class) + track.trackRows(s.track)
  + turret.classRows('two_man_autocannon') + turret.turretRows(s.turret))
