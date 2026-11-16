local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local m = import 'machine-kit.libsonnet';
local s = import 'skid_steer.spec.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
// The front door swings forward over the lowered bucket, so it hangs above a toe board as tall as the bucket's mount,
// and the arms' cross brace and the tilt rams keep out of its sweep: the brace crosses behind the cab, and each ram
// runs down the front of its arm to the bucket.
local doorHeight(share) = s.doorSill + share * (s.roof - 0.02 - s.doorSill);
local doorPins = k.hingePins('hinge', 'y', [s.cageFront + 0.04 + k.grain, doorHeight(0.1), -s.cageSide + 0.04],
                             [s.cageFront + 0.04 + k.grain, doorHeight(0.9), -s.cageSide + 0.04], slot='bar');
// The sponsons' inner walls stand clear of the engine's alternator, the widest thing on the block.
local sponsonInner = 0.42;
local sponsonTop = 0.8;
local tailPins = k.hingePins('hinge', 'y', [s.tailDoor - k.grain, 0.58, 0.5], [s.tailDoor - k.grain, 1.06, 0.5], slot='trim');
local round(piece) = piece + { sides: 12 };
// The engine cover's outline in (x, y): its sheet's thickness, measured square to the top and the sides and upright
// through the slope.
local coverTop = 1.42;
local coverSide = 0.47;
local slopeFoot = 1.24;
local skin = 0.04;
local slopeSkin = 0.065;
local coverProfile = [[-1.24, sponsonTop], [s.cageRear, sponsonTop], [s.cageRear, coverTop], [-1.1, coverTop], [-1.24, slopeFoot]];
// The engine room's fitted parts, which the hoses run between.
local engine = (import 'engines.libsonnet')[s.engine.name];
local radiator = (import 'radiators.libsonnet')[s.radiator.name];
local cooling = import 'cooling-kit.libsonnet';
local engineFront = s.engine.at[0] + engine.length / 2;
local radiatorFront = s.radiator.at[0] + cooling.front;
local radiatorTop = s.radiator.at[1] + radiator.height;
local hose = 0.02;
// Each coolant hose's (y, z) where it leaves its side tank, as the kit's own hoses do, and the height the lower one
// runs forward at, under the exhaust manifold.
local upperHose = [radiatorTop - 0.06, radiator.width / 2 - 0.02];
local lowerHose = [s.radiator.at[1] + 0.06, -(radiator.width / 2 - 0.02)];
local lowerRun = 0.64;
local coolerX = s.radiator.at[0];
local coolerBase = radiatorTop + 0.01;
local coolerTop = coolerBase + 0.09;
local coolerMiddle = (coolerBase + coolerTop) / 2;
local coolerHalf = 0.28;
local oilHose = 0.0175;
local tank = { x: [-1.22, -0.97], z: [0.06, 0.34], top: 0.74 };
// The cooler's return drops between the radiator's near tank and the tail door.
local returnX = -1.21;
local returnZ = 0.32;
taxonomy.inherit({ tags: { 'vehicle-body': ['plant'] } }, [
  k.compound('skid_steer_frame', s.shellMass, [
    box('floor', 'steel', [s.cageRear, 0.4, -sponsonInner - 0.01], [s.cageFront, s.floor, sponsonInner + 0.01]),
    box('belly', 'steel', [-1.2, 0.3, -sponsonInner - 0.01], [s.cageFront, 0.5, sponsonInner + 0.01]),
    box('foot_board', 'mat', [0.3, s.floor, -sponsonInner], [s.cageFront, s.floor + 0.03, sponsonInner]),
    box('seat_box', 'steel', [-0.32, s.floor, -0.28], [0.14, s.floor + 0.2, 0.28]),
  ] + bothSides([
    box('sponson', 'steel', [-1.05, 0.28, sponsonInner], [0.95, sponsonTop, 0.56]),
    box('tower', 'paint', [-1.08, 0.78, 0.48], [-0.62, 1.82, 0.62]),
    box('tower_top', 'paint', [-1.0, 1.6, 0.48], [-0.6, 1.92, 0.62]),
  ]), { steel: 'paint-charcoal', mat: 'rubber-black', paint: s.paint }) + { title: 'Skid-steer loader frame' },
  k.compound('skid_steer_chain_case', 180, [
    box('case', 'steel', [-0.75, 0.3, 0.5], [0.75, 0.5, 0.6]),
    m.axleDisc('stub_front', 'steel', s.frontAxle, s.hub, 0.09, [0.54, 0.62], 12),
    m.axleDisc('stub_rear', 'steel', s.rearAxle, s.hub, 0.09, [0.54, 0.62], 12),
  ], { steel: 'paint-charcoal' }) + { title: 'Skid-steer loader chain case' },
  k.compound('skid_steer_cage', 150, [
    box('roof', 'paint', [s.cageRear - 0.05, s.roof - 0.02, -s.cageSide - 0.03], [s.cageFront + 0.05, s.roof + 0.05, s.cageSide + 0.03]),
    box('rear_wall', 'bar', [s.cageRear, s.floor, -s.cageSide], [s.cageRear + 0.05, 1.42, s.cageSide]),
    box('rear_top', 'bar', [s.cageRear, 1.9, -s.cageSide], [s.cageRear + 0.05, s.roof, s.cageSide]),
    box('rear_glass', 'glass', [s.cageRear + 0.01, 1.42, -s.cageSide + 0.05], [s.cageRear + 0.04, 1.9, s.cageSide - 0.05]),
    box('toe_board', 'paint', [s.cageFront, s.floor, -sponsonInner], [s.cageFront + 0.04, sponsonTop, sponsonInner]),
    box('toe_board_top', 'paint', [s.cageFront, sponsonTop, -s.cageSide + 0.04], [s.cageFront + 0.04, s.doorSill, s.cageSide - 0.04]),
  ] + bothSides([
    box('post_front', 'bar', [s.cageFront - 0.06, s.floor, s.cageSide - 0.05], [s.cageFront, s.roof, s.cageSide]),
    box('post_rear', 'bar', [s.cageRear, s.floor, s.cageSide - 0.05], [s.cageRear + 0.06, s.roof, s.cageSide]),
    box('side_lower', 'paint', [s.cageRear, s.floor, s.cageSide - 0.04], [s.cageFront, 1.08, s.cageSide]),
    box('mesh_a', 'bar', [s.cageRear, 1.26, s.cageSide - 0.04], [s.cageFront, 1.3, s.cageSide]),
    box('mesh_b', 'bar', [s.cageRear, 1.48, s.cageSide - 0.04], [s.cageFront, 1.52, s.cageSide]),
    box('mesh_c', 'bar', [s.cageRear, 1.7, s.cageSide - 0.04], [s.cageFront, 1.74, s.cageSide]),
  ]), { paint: s.paint, bar: 'paint-charcoal', glass: 'glass-clear' }) + { title: 'Skid-steer loader cage' },
  k.compound('skid_steer_door', 28, [
    box('sill', 'bar', [s.cageFront, s.doorSill, -s.cageSide + 0.04], [s.cageFront + 0.04, s.doorSill + 0.06, s.cageSide - 0.04]),
    box('head', 'bar', [s.cageFront, s.roof - 0.08, -s.cageSide + 0.04], [s.cageFront + 0.04, s.roof - 0.02, s.cageSide - 0.04]),
    box('stile_near', 'bar', [s.cageFront, s.doorSill, s.cageSide - 0.1], [s.cageFront + 0.04, s.roof - 0.02, s.cageSide - 0.04]),
    box('stile_far', 'bar', [s.cageFront, s.doorSill, -s.cageSide + 0.04], [s.cageFront + 0.04, s.roof - 0.02, -s.cageSide + 0.1]),
    box('glass', 'glass', [s.cageFront + 0.01, s.doorSill + 0.06, -s.cageSide + 0.1], [s.cageFront + 0.03, s.roof - 0.08, s.cageSide - 0.1]),
  ] + doorPins, { bar: 'paint-charcoal', glass: 'glass-clear' }, motion=k.motion.hinge(doorPins, 'fore', s.doorOpens))
  + { title: 'Skid-steer loader door' },
  // The cover is a sheet-metal shell on the frame's sponsons, the cab's rear wall closing its front, so the open tail
  // door looks into the engine room.
  k.compound('skid_steer_engine_cover', 90, [
    box('top', 'paint', [-1.1, coverTop - skin, -coverSide], [s.cageRear, coverTop, coverSide]),
    prism('slope', 'paint', [[-1.24, slopeFoot - slopeSkin], [-1.1, coverTop - slopeSkin], [-1.1, coverTop], [-1.24, slopeFoot]], [-coverSide, coverSide]),
    box('hood_top_vent', 'trim', [-1.0, coverTop, -0.3], [-0.55, coverTop + 0.02, 0.3]),
  ] + bothSides([
    prism('side', 'paint', coverProfile, [coverSide - skin, coverSide]),
    box('tail', 'paint', [-1.24, 0.5, sponsonInner], [-1.05, sponsonTop, coverSide]),
  ]), { paint: s.paint, trim: 'paint-charcoal' }) + { title: 'Skid-steer loader engine cover' },
  // The coolant hoses run forward from the radiator's side tanks to the water jacket beside the head and the block,
  // because the water pump is at the engine's front, by the cab.
  k.compound('skid_steer_coolant_hoses', 1.2, [
    round(k.turned('upper', 'hose', 'x', k.disc(hose, radiatorFront, engineFront - 0.05), [0, upperHose[0], upperHose[1]])),
    round(k.turned('upper_elbow', 'hose', 'z', k.disc(hose, engine.width * 0.44, upperHose[1]), [engineFront - 0.05, upperHose[0], 0])),
    k.bar('lower_drop', 'hose', [radiatorFront, lowerHose[0]], [radiatorFront + 0.1, lowerRun], 2 * hose, [lowerHose[1] - hose, lowerHose[1] + hose]),
    round(k.turned('lower', 'hose', 'x', k.disc(hose, radiatorFront + 0.1, engineFront - 0.18), [0, lowerRun, lowerHose[1]])),
    round(k.turned('lower_elbow', 'hose', 'z', k.disc(hose, lowerHose[1], -engine.width / 2), [engineFront - 0.18, lowerRun, 0])),
  ], { hose: 'rubber-black' }) + { title: 'Skid-steer loader coolant hoses' },
  // The hydraulic oil cooler stands on the radiator, under the cover's slope, so the pusher fan's air leaves through the
  // tail door's grille past both cores.
  k.compound('skid_steer_oil_cooler', 6, [
    box('core', 'core', [coolerX - 0.025, coolerBase, -coolerHalf + 0.04], [coolerX + 0.025, coolerTop, coolerHalf - 0.04]),
  ] + bothSides([
    box('tank', 'tank', [coolerX - 0.04, coolerBase, coolerHalf - 0.04], [coolerX + 0.04, coolerTop, coolerHalf]),
  ]), { core: 'alu-bare', tank: 'paint-charcoal' }) + { title: 'Skid-steer loader hydraulic oil cooler' },
  // The tank stands on the frame's floor below the cooler stack, its sight gauge facing the tail door and its return
  // filter on top, where the oil level and the filter can be serviced through the open door.
  k.compound('skid_steer_hydraulic_tank', 22, [
    box('tank', 'tank', [tank.x[0], 0.5, tank.z[0]], [tank.x[1], tank.top, tank.z[1]]),
    box('gauge', 'glass', [tank.x[0] - 0.01, 0.58, tank.z[0] + 0.08], [tank.x[0], 0.7, tank.z[0] + 0.12]),
    round(k.turned('filler', 'cap', 'y', k.disc(0.03, tank.top, tank.top + 0.015), [tank.x[0] + 0.05, 0, tank.z[0] + 0.09])),
    round(k.turned('filter', 'filter', 'y', k.disc(0.045, tank.top, tank.top + 0.12), [tank.x[1] - 0.05, 0, tank.z[0] + 0.12])),
  ], { tank: 'paint-charcoal', glass: 'glass-clear', cap: 'plastic-black', filter: 'plastic-yellow' })
  + { title: 'Skid-steer loader hydraulic tank' },
  // The cooler's feed comes from the control valve under the cab; its return drops behind the radiator's near tank into
  // the hydraulic tank.
  k.compound('skid_steer_hydraulic_hoses', 1.4, [
    round(k.turned('feed', 'hose', 'x', k.disc(oilHose, coolerX + 0.04, s.cageRear), [0, coolerMiddle, coolerHalf - 0.02])),
    round(k.turned('return_out', 'hose', 'x', k.disc(oilHose, returnX, coolerX - 0.04), [0, coolerMiddle, coolerHalf - 0.02])),
    round(k.turned('return_across', 'hose', 'z', k.disc(oilHose, coolerHalf - 0.02, returnZ), [returnX, coolerMiddle, 0])),
    round(k.turned('return_drop', 'hose', 'y', k.disc(oilHose, tank.top, coolerMiddle), [returnX, 0, returnZ])),
  ], { hose: 'rubber-black' }) + { title: 'Skid-steer loader hydraulic hoses' },
  k.compound('skid_steer_tail_door', 30, [
    box('panel', 'trim', [s.tailDoor, 0.42, -0.5], [s.tailDoor + 0.06, 1.22, 0.5]),
    box('grille_a', 'bar', [s.tailDoor - 0.01, 0.66, -0.36], [s.tailDoor, 0.7, 0.36]),
    box('grille_b', 'bar', [s.tailDoor - 0.01, 0.78, -0.36], [s.tailDoor, 0.82, 0.36]),
    box('grille_c', 'bar', [s.tailDoor - 0.01, 0.9, -0.36], [s.tailDoor, 0.94, 0.36]),
  ] + tailPins, { trim: 'paint-charcoal', bar: 'plastic-black' }, motion=k.motion.hinge(tailPins, 'rear', s.tailDoorOpens))
  + { title: 'Skid-steer loader tail door' },
  k.compound('skid_steer_lift_arms', 260, [
    k.bar('brace', 'paint', [-0.58, 1.71], [-0.46, 1.69], 0.14, [-0.62, 0.62]),
  ] + bothSides([
    k.bar('beam_rear', 'paint', [-0.82, 1.74], [0.45, 1.58], 0.2, [0.5, 0.645], 0.17),
    k.bar('beam_drop', 'paint', [0.45, 1.58], [1.1, 0.8], 0.17, [0.5, 0.645], 0.13),
    m.axleDisc('elbow', 'paint', 0.45, 1.58, 0.085, [0.5, 0.645], 12),
    m.axleDisc('pivot', 'pin', -0.82, 1.74, 0.07, [0.46, 0.66], 12),
    m.axleDisc('tip_pin', 'pin', 1.1, 0.8, 0.06, [0.46, 0.66], 12),
  ]), { paint: s.paint, pin: 'steel-stainless' }) + { title: 'Skid-steer loader lift arms' },
  k.compound('skid_steer_bucket', 190, [
    k.bar('floor', 'shell', [1.14, 0.08], [2.0, 0.05], 0.06, [-0.86, 0.86]),
    k.bar('back', 'shell', [1.14, 0.06], [1.14, 0.74], 0.06, [-0.86, 0.86]),
    k.bar('top', 'shell', [1.13, 0.72], [1.52, 0.82], 0.06, [-0.86, 0.86]),
    box('edge', 'edge', [1.92, 0.03, -0.86], [2.04, 0.07, 0.86]),
    box('mount', 'edge', [1.08, 0.2, -0.58], [1.14, 0.9, 0.58]),
  ] + bothSides([
    prism('side', 'shell', [[1.11, 0.03], [2.04, 0.03], [1.52, 0.84], [1.11, 0.76]], [0.82, 0.86]),
  ]), { shell: 'paint-charcoal', edge: 'steel-grey' }) + { title: 'Skid-steer loader bucket' },
  k.compound('skid_steer_lift_ram', 40, [
    k.bar('barrel', 'dark', [-0.86, 0.9], [-0.3, 1.28], 0.11, [0.62, 0.71]),
    k.bar('rod', 'bright', [-0.32, 1.26], [0.06, 1.56], 0.05, [0.64, 0.69]),
    box('lug', 'dark', [-0.02, 1.5, 0.6], [0.1, 1.62, 0.7]),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }) + { title: 'Skid-steer loader lift ram' },
  k.compound('skid_steer_tilt_ram', 22, [
    k.bar('barrel', 'dark', [0.7, 1.483], [1.04, 1.117], 0.1, [0.525, 0.62]),
    k.bar('rod', 'bright', [1.02, 1.14], [1.3, 0.81], 0.05, [0.55, 0.595]),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }) + { title: 'Skid-steer loader tilt ram' },
  k.compound('skid_steer_exhaust', 4, [
    k.turned('pipe', 'steel', 'y', k.disc(0.035, 0, 0.3)) + { sides: 12 },
  ], { steel: 'steel-spall-black' }) + { title: 'Skid-steer loader exhaust' },
])
