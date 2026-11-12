local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local t = import 'truck-cab.libsonnet';
local k = import 'kit.libsonnet';
local box = k.box;
local s = t.spec(import 'airport_crash_tender.spec.libsonnet');
local finish = { paint: s.paint, white: 'paint-white', red: 'paint-red', frame: 'paint-charcoal', steel: 'steel-grey', alu: 'alu-bare', dark: 'plastic-black', tank: 'polymer-black', foam: 'plastic-red', pipe: 'steel-stainless' };
local round(piece) = piece + { sides: 16 };
// One opening spans the tandem, since its tyres stand too close for a pier between them.
local archRear = s.rearAxles[1] - s.r - 0.12;
local archFront = s.rearAxles[0] + s.r + 0.12;
local archTop = s.bodyFloor - 0.05;
local archChamfer = 0.3;
local bandLow = s.floor - 0.03;
local bandTop = s.floor + 0.07;
local shutterTop = s.bodyTop - 0.1;
local inset = s.bodySide - 0.04;
local shutter(name, x0, x1, y0, y1) = k.shutter(name, x0, x1, y0, y1, [inset, s.bodySide]);
// The posts between lockers: their centres along the body, and their half width.
local dividers = { mid: 0.96, wheel: -2.4 };
local postHalf = 0.04;
local post(name, x) = box('post_' + name, 'paint', [x - postHalf, bandTop, inset], [x + postHalf, shutterTop, s.bodySide]);
// The roof turret stands on the cab's crown, the bumper turret on the bumper's top.
local turretY = s.crown;
local bumperTurretY = s.bumperTop;
local railY = s.bodyTop + 0.42;
local posts = [s.bodyRear + 0.15 + i * (s.bodyFront - s.bodyRear - 0.3) / 6 for i in std.range(0, 6)];
// The ladder stands inboard of the tail lamps.
local ladderZ = [0.5, 0.88];
local stays = [1.6, 3.0];
local rungs = std.range(0, std.floor((railY - 0.95) / 0.3));
// A monitor's head: a swivel under a housing between two cheeks, and a barrel ending in a flared nozzle, all about the
// head's pivot at `at`, scaled by `size` so the roof and bumper turrets share one shape.
local monitorHead(at, size, reach) = [
  round(k.turned('swivel', 'steel', 'y', k.disc(0.17 * size, 0, 0.1 * size), at)),
  box('housing', 'paint', [at[0] - 0.2 * size, at[1] + 0.1 * size, -0.16 * size], [at[0] + 0.12 * size, at[1] + 0.32 * size, 0.16 * size]),
  round(k.turned('barrel', 'pipe', 'x', k.disc(0.085 * size, 0.12 * size, reach), [at[0], at[1] + 0.22 * size, 0])),
  round(k.turned('nozzle', 'pipe', 'x', [[reach, 0], [reach, 0.11 * size], [reach + 0.35 * size, 0.14 * size], [reach + 0.35 * size, 0], [reach, 0]], [at[0], at[1] + 0.22 * size, 0])),
  round(k.turned('tip', 'dark', 'x', k.annulus(0.1 * size, 0.15 * size, reach + 0.35 * size, reach + 0.41 * size), [at[0], at[1] + 0.22 * size, 0])),
] + k.bothSides([
  box('cheek', 'paint', [at[0] - 0.12 * size, at[1] + 0.1 * size, 0.16 * size], [at[0] + 0.12 * size, at[1] + 0.38 * size, 0.22 * size]),
]);
taxonomy.inherit({ tags: { 'vehicle-body': ['truck'] } }, t.rows('airport_crash_tender', s) + [
  k.compound('airport_crash_tender_body', s.bodyMass, [
    box('floor', 'frame', [s.bodyRear, s.bodyFloor - 0.05, -s.bodySide], [s.bodyFront, s.bodyFloor, s.bodySide]),
    box('roof', 'paint', [s.bodyRear, s.bodyTop - 0.05, -s.bodySide], [s.bodyFront, s.bodyTop, s.bodySide]),
    box('front_wall', 'paint', [s.bodyFront - 0.05, s.bodyFloor, -s.bodySide], [s.bodyFront, s.bodyTop, s.bodySide]),
    box('rear_wall', 'paint', [s.bodyRear, s.bodyFloor, -s.bodySide], [s.bodyRear + 0.05, s.bodyTop, s.bodySide]),
  ] + k.bothSides([
    box('wall', 'paint', [s.bodyRear, s.bodyFloor, inset - 0.04], [s.bodyFront, s.bodyTop, inset]),
    box('low_fore', 'paint', [archFront, s.bodyLow, inset], [s.bodyFront, archTop, s.bodySide]),
    box('low_aft', 'paint', [s.bodyRear, s.bodyLow, inset], [archRear, archTop, s.bodySide]),
    box('sill', 'paint', [s.bodyRear, archTop, inset], [s.bodyFront, bandLow, s.bodySide]),
  ] + t.archCorners('arch', 'paint', archRear, archFront, archTop, archChamfer, inset, s.bodySide)
    + t.archCorners('arch_liner', 'frame', archRear, archFront, archTop, archChamfer, 0.56, inset) + [
    box('arch_wall', 'frame', [archRear, 2 * s.r - 0.12, 0.56], [archFront, archTop, 0.59125]),
    box('arch_jamb_aft', 'frame', [archRear, s.bodyLow, 0.56], [archRear + 0.0625, archTop - archChamfer, inset]),
    box('arch_jamb_fore', 'frame', [archFront - 0.0625, s.bodyLow, 0.56], [archFront, archTop - archChamfer, inset]),
    box('band', 'red', [s.bodyRear, bandLow, inset], [s.bodyFront, bandTop, s.bodySide]),
    box('cap', 'white', [s.bodyRear, s.bodyTop - 0.1, inset], [s.bodyFront, s.bodyTop, s.bodySide]),
    post('rear', s.bodyRear + postHalf),
    post('front', s.bodyFront - postHalf),
    post('mid', dividers.mid),
    post('wheel', dividers.wheel),
  ] + [
    box('chevron_' + i, if i % 2 == 0 then 'red' else 'white', [s.bodyRear - 0.006, s.bodyLow + i * 0.3, 0.6], [s.bodyRear, s.bodyLow + (i + 1) * 0.3, s.bodySide])
    for i in std.range(0, 7)
  ]), finish),
  k.compound('airport_crash_tender_cab_stripe', 6, k.bothSides([
    box('band', 'red', [s.cabBack, bandLow, s.side], [s.face, bandTop, s.side + 0.032]),
  ]), finish),
  // 12,500 l of water fill the body between the locker rows; the foam concentrate rides in a smaller tank ahead of it.
  k.compound('airport_crash_tender_water_tank', s.waterTankMass, [
    box('tank', 'tank', [archRear + 0.1, s.bodyFloor, -0.9], [0.6, shutterTop, 0.9]),
  ], finish),
  k.compound('airport_crash_tender_foam_tank', s.foamTankMass, [
    box('tank', 'foam', [0.7, s.bodyFloor, -0.9], [1.8, shutterTop, 0.9]),
  ], finish),
  // The pump sits in the rear lockers behind the tandem, its suction drawn from the tank ahead.
  k.compound('airport_crash_tender_pump', s.pumpMass, [
    round(k.turned('volute', 'steel', 'z', k.disc(0.32, -0.22, 0.22), [-4.7, s.bodyFloor + 0.42, 0])),
    box('gearcase', 'frame', [-5.2, s.bodyFloor, -0.3], [-4.95, s.bodyFloor + 0.6, 0.3]),
    round(k.turned('suction', 'pipe', 'x', k.disc(0.1, -4.4, archRear + 0.1), [0, s.bodyFloor + 0.42, 0])),
    round(k.turned('riser', 'pipe', 'y', k.disc(0.08, s.bodyFloor + 0.74, shutterTop), [-4.7, 0, 0])),
  ], finish),
  k.compound('airport_crash_tender_lockers', s.lockersMass,
    shutter('fore', dividers.mid + postHalf, s.bodyFront - 2 * postHalf, bandTop, shutterTop)
    + shutter('mid', archFront + 0.02, dividers.mid - postHalf, bandTop, shutterTop)
    + shutter('wheel_fore', dividers.wheel + postHalf, archFront - 0.02, bandTop, shutterTop)
    + shutter('wheel_aft', archRear + 0.02, dividers.wheel - postHalf, bandTop, shutterTop)
    + shutter('aft', s.bodyRear + 2 * postHalf, archRear - 0.02, bandTop, shutterTop)
    + [
      box('low_fore_handle', 'dark', [0.9, archTop - 0.2, s.bodySide], [1.4, archTop - 0.16, s.bodySide + 0.032]),
      box('low_aft_handle', 'dark', [-5.1, archTop - 0.2, s.bodySide], [-4.6, archTop - 0.16, s.bodySide + 0.032]),
    ], finish),
  // The water main runs from the body over the cab's back to the roof turret, which turns on it.
  k.compound('airport_crash_tender_roof_turret_mount', s.turretMountMass, [
    round(k.turned('base', 'frame', 'y', k.disc(0.26, 0, 0.06), [s.turretX, turretY, 0])),
    round(k.turned('riser', 'pipe', 'y', k.disc(0.13, 0.06, 0.3), [s.turretX, turretY, 0])),
    round(k.turned('main', 'pipe', 'x', k.disc(0.08, s.bodyFront, s.turretX), [0, turretY + 0.14, 0])),
  ], finish),
  k.compound('airport_crash_tender_roof_turret', s.turretMass, monitorHead([s.turretX, turretY + 0.3, 0], 1, 1.3), finish),
  k.compound('airport_crash_tender_bumper_turret', s.bumperTurretMass, [
    round(k.turned('base', 'frame', 'y', k.disc(0.12, 0, 0.05), [s.bumperTurretX, bumperTurretY, 0])),
  ] + monitorHead([s.bumperTurretX, bumperTurretY + 0.05, 0], 0.55, 0.42), finish),
  k.compound('airport_crash_tender_roof_rail', s.roofRailMass, [
    box('walkway', 'alu', [s.bodyRear + 0.1, s.bodyTop, -0.4], [s.bodyFront - 0.1, s.bodyTop + 0.03, 0.4]),
  ] + k.bothSides([
    box('rail', 'alu', [posts[0], railY, s.bodySide - 0.1], [posts[6] + 0.05, railY + 0.05, s.bodySide - 0.05]),
  ] + [
    box('post_' + i, 'alu', [posts[i], s.bodyTop, s.bodySide - 0.1], [posts[i] + 0.05, railY, s.bodySide - 0.05])
    for i in std.range(0, 6)
  ]), finish),
  k.compound('airport_crash_tender_rear_ladder', s.ladderMass, [
    box('stile_in', 'alu', [s.bodyRear - 0.12, 0.95, ladderZ[0]], [s.bodyRear - 0.08, railY, ladderZ[0] + 0.04]),
    box('stile_out', 'alu', [s.bodyRear - 0.12, 0.95, ladderZ[1] - 0.04], [s.bodyRear - 0.08, railY, ladderZ[1]]),
  ] + [
    box('rung_' + i, 'steel', [s.bodyRear - 0.12, 1.0 + i * 0.3, ladderZ[0] + 0.04], [s.bodyRear - 0.09, 1.03 + i * 0.3, ladderZ[1] - 0.04])
    for i in rungs
  ] + [
    box('stay_' + i, 'alu', [s.bodyRear - 0.08, stays[i], ladderZ[0]], [s.bodyRear, stays[i] + 0.04, ladderZ[0] + 0.04])
    for i in std.range(0, std.length(stays) - 1)
  ], finish),
])
