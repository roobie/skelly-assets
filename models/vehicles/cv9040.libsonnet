local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local apcHatch = (import 'apc.spec.libsonnet').hatch;
local hull = import 'armoured-hull-kit.libsonnet';
local s = import 'cv9040.spec.libsonnet';
local vehicle = import 'cv9040.placements.libsonnet';
local track = import 'track-kit.libsonnet';
local trackClasses = import 'track-classes.libsonnet';
local tracks = import 'tracks.libsonnet';
local turret = import 'turret-kit.libsonnet';
local box = k.box;
local paint = { paint: s.paint };
local steel = 'steel-parkerized';
local plate = s.rear + s.armour.rear;
// The troop door's half-width, its plate's inner face and its pins' x.
local door = { half: 0.5, face: s.rear + 0.06, pinX: s.rear - 0.06 };
local doorPins = k.hingePins('hinge_pin', 'y', [door.pinX, 0.8, door.half], [door.pinX, 1.35, door.half], 'steel');
local doorFar = door.half + k.swingStandOff(2 * door.half, door.face - door.pinX);
local trackOuter = s.trackZ + trackClasses[tracks[s.track].class].link.width / 2;
// The troop hatches are the APC's.
local troopHatches = [k.hatchHole(s.troopHatch.x, z, apcHatch.radius) for z in [s.troopHatch.z, -s.troopHatch.z]];
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'] } }, hull.rows(s, vehicle.title, troopHatches) + [
  // The near side's skirt outside the track's top run, hung from the sponson's edge above the track.
  k.compound('cv9040_side_skirt', 250, [
    box('hanger', 'paint', [-2.95, s.shelf, s.side], [2.2, hull.shelfTop(s), trackOuter]),
    box('skirt', 'paint', [-2.95, 0.8, trackOuter], [2.2, hull.shelfTop(s), s.skirt]),
  ], paint) + { title: 'Tracked infantry fighting vehicle side skirt' },
  // The rear plate round the troop door, its far side standing off the door's free edge.
  k.compound('cv9040_hull_rear', 600, [
    box('sill', 'paint', [s.rear, s.belly, -doorFar], [plate, 0.65, door.half]),
    box('header', 'paint', [s.rear, 1.5, -doorFar], [plate, s.roofTop, door.half]),
    box('post_near', 'paint', [s.rear, s.belly, door.half], [plate, s.shelf, s.wall]),
    box('sponson_end_near', 'paint', [s.rear, s.shelf, door.half], [plate, s.roofTop, s.side]),
    box('post_far', 'paint', [s.rear, s.belly, -s.wall], [plate, s.shelf, -doorFar]),
    box('sponson_end_far', 'paint', [s.rear, s.shelf, -s.side], [plate, s.roofTop, -doorFar]),
  ], paint) + { title: 'Tracked infantry fighting vehicle hull rear' },
  // The troop door, hinged on its near edge: its pins stand at the hinge straps' outer corner, so it swings clear of
  // the rear plate.
  k.compound('cv9040_rear_door', 300, [
    box('plate', 'paint', [s.rear - 0.02, 0.65, -door.half], [door.face, 1.5, door.half]),
    box('handle', 'steel', [door.pinX, 1.05, -0.4], [s.rear - 0.02, 1.1, -0.25]),
  ] + [
    box('hinge_' + i, 'steel', [door.pinX, 0.75 + i * 0.55, 0.42], [s.rear - 0.02, 0.85 + i * 0.55, door.half])
    for i in [0, 1]
  ] + doorPins, paint + { steel: steel }, motion=k.motion.hinge(doorPins, 'rear', s.rearDoorOpen)) + { title: 'Tracked infantry fighting vehicle rear door' },
  // A folding troop seat against the near wall, facing in: the origin is on the floor under the seat's back.
  k.compound('cv9040_troop_seat', 15, [
    box('cushion', 'cloth', [-0.22, 0.4, -0.42], [0.22, 0.48, -0.04]),
    box('back', 'cloth', [-0.22, 0.48, -0.06], [0.22, 0.98, 0]),
    box('leg', 'steel', [-0.03, 0, -0.36], [0.03, 0.4, -0.3]),
  ], { cloth: 'cloth-seat', steel: 'steel-grey' }) + { title: 'Tracked infantry fighting vehicle troop seat' },
] + track.classRows(tracks[s.track].class) + track.trackRows(s.track)
  + turret.classRows('two_man_autocannon') + turret.turretRows(s.turret))
