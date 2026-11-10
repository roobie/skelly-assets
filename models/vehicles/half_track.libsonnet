local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local m = import 'military-kit.libsonnet';
local mk = import 'machine-kit.libsonnet';
local s = import 'half_track.spec.libsonnet';
local track = import 'track-kit.libsonnet';
local wheelKit = import 'wheel-kit.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local finish = { paint: s.paint, steel: 'steel-parkerized', dark: 'steel-spall-black', glass: 'glass-clear', seat: 'cloth-olive-drab', spring: 'steel-grey' };
local inner = s.side - s.plate;
local back = s.rear + s.plate;
// The vision slits across the windscreen armour, one before each seat.
local slit = { y: [1.72, 1.77], z: [0.3, 0.7] };
local louvres = 6;
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'] } }, [
  // The armoured body round the cab and the open troop bay: its side plates, the rear plate round the door, the
  // scuttle under the windscreen and the floor. The cab's sides stop at the doors' height, the bay's run higher.
  k.compound('half_track_hull', 1650, [
    box('floor', 'paint', [back, s.floor - 0.04, -inner], [s.cowl, s.floor, inner]),
    box('scuttle', 'paint', [s.cowl, s.sideBottom, -s.side], [s.cowl + s.plate, s.scuttleTop, s.side]),
    box('rear_sill', 'paint', [s.rear, 0.64, -s.side], [back, s.floor - 0.02, s.side]),
    box('rear_header', 'paint', [s.rear, s.doorTop, -s.side], [back, s.bayTop, s.side]),
  ] + bothSides([
    box('bay_side', 'paint', [back, s.sideBottom, inner], [s.cabDoor[0], s.bayTop, s.side]),
    box('door_sill', 'paint', [s.cabDoor[0], s.sideBottom, inner], [s.cabDoor[1], s.floor + 0.02, s.side]),
    box('cab_post', 'paint', [s.cabDoor[1], s.sideBottom, inner], [s.cowl, s.doorTop, s.side]),
    box('rear_jamb', 'paint', [s.rear, s.floor - 0.02, s.rearDoorZ], [back, s.doorTop, s.side]),
  ]), finish),
  k.compound('half_track_hood', 190, [
    prism('top', 'paint', [[s.cowl + s.plate, s.hoodBack - s.plate], [s.nose - 0.05, s.hoodFront - s.plate], [s.nose - 0.05, s.hoodFront], [s.cowl + s.plate, s.hoodBack]], [-s.hoodZ, s.hoodZ]),
  ] + bothSides([
    prism('side', 'paint', [[s.cowl + s.plate, s.fenderTop], [s.nose - 0.05, s.fenderTop], [s.nose - 0.05, s.hoodFront - s.plate], [s.cowl + s.plate, s.hoodBack - s.plate]], [s.hoodZ - s.plate, s.hoodZ]),
  ]), finish),
  // The radiator's armour: a frame of plate round horizontal louvres that open to let the air through under fire.
  k.compound('half_track_radiator_armour', 70, [
    box('head', 'paint', [s.nose - 0.05, 1.34, -s.hoodZ], [s.nose, s.hoodFront, s.hoodZ]),
    box('foot', 'paint', [s.nose - 0.05, s.rail.y[1], -s.hoodZ], [s.nose, 0.98, s.hoodZ]),
    box('backing', 'dark', [s.nose - 0.05, 0.98, -(s.hoodZ - 0.08)], [s.nose - 0.04, 1.34, s.hoodZ - 0.08]),
  ] + bothSides([
    box('cheek', 'paint', [s.nose - 0.05, 0.98, s.hoodZ - 0.08], [s.nose, 1.34, s.hoodZ]),
  ]) + [
    box('louvre_' + i, 'paint', [s.nose - 0.04, 1.0 + i * 0.056, -(s.hoodZ - 0.08)], [s.nose + 0.02, 1.032 + i * 0.056, s.hoodZ - 0.08])
    for i in std.range(0, louvres - 1)
  ], finish),
  k.compound('half_track_windscreen', 20, [
    box('sill', 'paint', [s.cowl - 0.05, s.scuttleTop - 0.04, -0.9], [s.cowl, s.scuttleTop, 0.9]),
    box('head', 'paint', [s.cowl - 0.05, s.screenTop - 0.05, -0.9], [s.cowl - 0.01, s.screenTop - 0.01, 0.9]),
    box('centre_post', 'paint', [s.cowl - 0.05, s.scuttleTop, -0.02], [s.cowl - 0.01, s.screenTop - 0.05, 0.02]),
  ] + bothSides([
    box('glass', 'glass', [s.cowl - 0.04, s.scuttleTop, 0.02], [s.cowl - 0.02, s.screenTop - 0.05, 0.86]),
    box('post', 'paint', [s.cowl - 0.05, s.scuttleTop, 0.86], [s.cowl - 0.01, s.screenTop - 0.01, 0.9]),
  ]), finish),
  // Raised before the glass in action, folded forward onto the hood on the march: hinged along its foot.
  k.compound('half_track_windscreen_armour', 90, [
    box('lower', 'paint', [s.cowl, s.scuttleTop, -inner], [s.cowl + s.plate, slit.y[0], inner]),
    box('upper', 'paint', [s.cowl, slit.y[1], -inner], [s.cowl + s.plate, s.screenTop, inner]),
    box('slit_bar', 'paint', [s.cowl, slit.y[0], -slit.z[0]], [s.cowl + s.plate, slit.y[1], slit.z[0]]),
    box('hinge_0', 'steel', [s.cowl + s.plate, s.scuttleTop, -0.8], [s.cowl + s.plate + 0.03, s.scuttleTop + 0.05, -0.7]),
    box('hinge_1', 'steel', [s.cowl + s.plate, s.scuttleTop, 0.7], [s.cowl + s.plate + 0.03, s.scuttleTop + 0.05, 0.8]),
  ] + bothSides([
    box('slit_end', 'paint', [s.cowl, slit.y[0], slit.z[1]], [s.cowl + s.plate, slit.y[1], inner]),
  ]), finish, { hinge_a: ['hinge_0', [0.5, 0.5, 0.5]], hinge_b: ['hinge_1', [0.5, 0.5, 0.5]] }),
  // The near cab door, hinged at its front edge.
  k.compound('half_track_cab_door', 25, [
    box('plate', 'paint', [s.cabDoor[0], s.floor + 0.02, inner], [s.cabDoor[1], s.doorTop, s.side]),
    box('handle', 'dark', [s.cabDoor[0] + 0.08, 1.4, s.side], [s.cabDoor[0] + 0.2, 1.44, s.side + 0.03]),
    box('hinge_0', 'steel', [s.cabDoor[1] - 0.04, 1.05, s.side], [s.cabDoor[1], 1.13, s.side + 0.03]),
    box('hinge_1', 'steel', [s.cabDoor[1] - 0.04, 1.45, s.side], [s.cabDoor[1], 1.53, s.side + 0.03]),
  ], finish, { hinge_a: ['hinge_0', [1, 0.5, 1]], hinge_b: ['hinge_1', [1, 0.5, 1]] }),
  // The troop bay's door, hinged on its near edge.
  k.compound('half_track_rear_door', 25, [
    box('plate', 'paint', [s.rear, s.floor - 0.02, -s.rearDoorZ], [back, s.doorTop, s.rearDoorZ]),
    box('handle', 'dark', [s.rear - 0.03, 1.25, -0.24], [s.rear, 1.29, -0.12]),
    box('hinge_0', 'steel', [s.rear - 0.03, 1.05, s.rearDoorZ - 0.06], [s.rear, 1.13, s.rearDoorZ]),
    box('hinge_1', 'steel', [s.rear - 0.03, 1.45, s.rearDoorZ - 0.06], [s.rear, 1.53, s.rearDoorZ]),
  ], finish, { hinge_a: ['hinge_0', [0, 0.5, 1]], hinge_b: ['hinge_1', [0, 0.5, 1]] }),
  // The near front fender over the steered wheel, sloping down at the front and back to the cab's sill.
  k.compound('half_track_front_fender', 30, m.flatGuard('guard', 'paint', [1.2, 2.42], s.fenderTop, 0.2, 0.16, s.fenderZ), finish),
  // The front bumper across the frame horns, with the brackets the unditching roller turns in.
  k.compound('half_track_bumper', 80, [
    box('bar', 'paint', [s.bumper.x[0], s.bumper.y[0], -s.side], [s.bumper.x[1], s.bumper.y[1], s.side]),
  ] + bothSides([
    box('roller_bracket', 'paint', [s.bumper.x[1], s.roller.y - 0.08, s.roller.halfLength], [s.roller.x + 0.06, s.roller.y + 0.08, s.roller.halfLength + 0.08]),
  ]), finish),
  // A drum ahead of the bumper that rolls the nose up and out of a ditch or over a bank instead of digging in.
  k.compound('half_track_unditching_roller', 70, [
    k.turned('drum', 'paint', 'z', k.disc(s.roller.radius, -s.roller.halfLength, s.roller.halfLength), [s.roller.x, s.roller.y, 0]) + { sides: 16 },
  ], finish),
  // The ladder frame: two rails from the bumper to the rear plate, three crossmembers, the front axle's leaf springs and
  // the seats the rear axle is bolted up to under the rails.
  k.compound('half_track_frame', 650, [
    box('cross_front', 'steel', [s.bumper.x[0] - 0.08, s.rail.y[0], -s.rail.z[0]], [s.bumper.x[0], s.rail.y[1], s.rail.z[0]]),
    box('cross_mid', 'steel', [-0.1, s.rail.y[0], -s.rail.z[0]], [0, s.rail.y[1], s.rail.z[0]]),
    box('cross_rear', 'steel', [s.rail.x[0], s.rail.y[0], -s.rail.z[0]], [s.rail.x[0] + 0.08, s.rail.y[1], s.rail.z[0]]),
  ] + bothSides([
    box('rail', 'steel', [s.rail.x[0], s.rail.y[0], s.rail.z[0]], [s.rail.x[1], s.rail.y[1], s.rail.z[1]]),
    box('front_spring', 'spring', [s.frontAxle - 0.5, s.hub + 0.12, s.rail.z[0]], [s.frontAxle + 0.5, s.rail.y[0], s.rail.z[1]]),
    box('axle_seat', 'steel', [s.rearAxle - 0.09, 0.64, s.rail.z[0]], [s.rearAxle + 0.09, s.rail.y[0], s.rail.z[1]]),
  ]), finish),
  // Its wheels carry the wheel kit's drums, so it is drawn without its own and is lighter by theirs.
  mk.driveAxle('half_track_front_axle', 600 - 2 * wheelKit.brakeMass('medium', 'drum'), s.wheelZ - 0.03, true, s.rail.z, drums=false),
  // The rear axle drives the sprockets, so its hubs end at theirs.
  mk.driveAxle('half_track_rear_axle', 650, s.trackZ - 0.18, false, s.rail.z),
  // One volute-sprung bogie: its arms carry two road wheels' hubs and its bracket bolts to the track's girder above
  // them. The origin is the bogie's centre at its wheels' axle height, in the track's centre plane, +z outboard.
  k.compound('half_track_bogie', 60, [
    box('mount', 'paint', [-0.15, 0.16, -0.3], [0.15, 0.3, -0.12]),
    k.turned('volute', 'spring', 'y', k.disc(0.08, 0, 0.16), [0, 0, -0.24]) + { sides: 12 },
  ] + [
    box('arm_' + i, 'paint', [[-0.24, 0.08][i], -0.04, -0.3], [[-0.08, 0.24][i], 0.06, -0.18])
    for i in [0, 1]
  ], finish),
  // The transfer case behind the gearbox splits the drive between the front axle and the rear.
  k.compound('half_track_transfer_case', 90, [
    box('case', 'steel', [-0.2, 0, -0.2], [0.2, 0.4, 0.2]),
  ], { steel: 'steel-grey' }),
  k.compound('half_track_rear_shaft', 8, [
    k.turned('tube', 'steel', 'x', k.disc(0.04, -0.21, 0.21)),
  ], { steel: 'steel-grey' }),
  // The near fuel tank, standing in the bay behind the cab's seats.
  k.compound('half_track_fuel_tank', 35, [
    box('tank', 'paint', [-0.75, s.floor, 0.54], [-0.15, 1.4, inner]),
    k.turned('cap', 'dark', 'y', k.disc(0.05, 1.4, 1.44), [-0.3, 0, 0.7]) + { sides: 12 },
  ], finish),
  // The near troop bench: a seat lid over a stowage locker, its back against the bay's side.
  k.compound('half_track_bench', 50, [
    box('locker', 'paint', [-2.98, s.floor, 0.54], [-0.85, 1.3, inner]),
    box('cushion', 'seat', [-2.96, 1.3, 0.56], [-0.87, 1.36, inner]),
    box('back', 'seat', [-2.96, 1.46, inner - 0.06], [-0.87, 1.72, inner]),
  ], finish),
  // A mount only: a post behind the cab ends in an empty cradle, its gun left to the game.
  k.compound('half_track_pedestal', 70, [
    box('base', 'steel', [-0.2, 0, -0.2], [0.2, 0.04, 0.2]),
    k.turned('post', 'steel', 'y', k.disc(0.06, 0.04, 1.2)) + { sides: 12 },
    k.turned('collar', 'dark', 'y', k.disc(0.09, 1.18, 1.24)) + { sides: 12 },
    box('cradle', 'steel', [-0.1, 1.24, -0.14], [0.1, 1.27, 0.14]),
  ] + bothSides([
    box('cradle_arm', 'steel', [-0.05, 1.27, 0.11], [0.05, 1.32, 0.14]),
  ]), finish, { mount: ['cradle', [0.5, 1, 0.5]] }),
  k.compound('half_track_dashboard', 15, [
    box('panel', 'paint', [s.cowl - 0.06, 1.2, -inner], [s.cowl, s.scuttleTop - 0.04, inner]),
    box('dial', 'dark', [s.cowl - 0.07, 1.34, -0.62], [s.cowl - 0.06, 1.42, -0.4]),
    box('column', 'dark', [0.78, 1.34, -0.52], [s.cowl - 0.06, 1.38, -0.48]),
  ], finish),
  // The near mine rack, hung outside the bay's side over the track.
  k.compound('half_track_mine_rack', 15, [
    box('shelf', 'paint', [-2.6, 1.2, s.side], [-1.0, 1.23, 1.1]),
    box('lip', 'paint', [-2.6, 1.23, 1.07], [-1.0, 1.4, 1.1]),
  ] + [
    box('bracket_' + i, 'paint', [[-2.6, -1.04][i], 1.23, s.side], [[-2.56, -1.0][i], 1.4, 1.07])
    for i in [0, 1]
  ], finish),
] + track.classRows('band_light') + track.trackRows('half_track_track'))
