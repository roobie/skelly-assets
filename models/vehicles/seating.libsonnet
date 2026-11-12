// Which vehicle parts may sink into which, and how far. A fit says that a part at a site whose role is in `seated` sits
// in the parts at sites whose role is in `into`, up to `depth` metres, for the reason `why`; it holds in either
// direction and for every vehicle. A role is a site id without its `_near` / `_far` side and its number, so
// `wheel_front_near` and `wheel_front_far` are both `wheel_front`, and a role is named exactly, not by a pattern.
// Two parts at different sites overlap only when they share more than one voxel grain of depth
// (`tools/siteOverlap.mjs`), and a fit covers a pair when both roles are named and the overlap is no deeper than
// `depth`. A fit that names a role no site has, or a pair of roles that two fits cover, is reported. The reasons for
// the rule are in `docs/decisions/0014-site-overlap.md`.
local fit(why, depth, seated, into) = { why: why, depth: depth, seated: seated, into: into };
{
  fits: [
    fit(
      'A wheel is set over the hub of its axle, strut or gear leg, so the solids share the hub.',
      0.125,
      [
        'first_axle_wheel', 'front_rim', 'front_wheel', 'last_axle_wheel', 'main_wheel', 'middle_wheel',
        'rear_inner_wheel', 'rear_rim', 'rear_wheel', 'rim_rear', 'wheel', 'wheel_front', 'wheel_front_up',
        'wheel_rear', 'wheel_rear_road', 'wheel_rear_up',
      ],
      [
        'aft_rear_axle', 'axle', 'front_axle', 'front_strut', 'gear_strut', 'rear_axle', 'shock',
      ],
    ),
    fit(
      'A wheel stands in its arch, which the body draws as boxes that are not cut away around the tyre.',
      0.125,
      [
        'first_axle_wheel', 'front_rim', 'front_wheel', 'last_axle_wheel', 'main_wheel', 'middle_wheel',
        'rear_inner_wheel', 'rear_rim', 'rear_wheel', 'rim_rear', 'wheel', 'wheel_front', 'wheel_front_up',
        'wheel_rear', 'wheel_rear_road', 'wheel_rear_up',
      ],
      [
        'belly', 'chassis', 'crushed_nose', 'front_bumper', 'rear_bench', 'rear_underrun', 'shell',
      ],
    ),
    fit(
      'A brake disc is set on the hub of its axle.',
      0.05,
      [
        'aft_rear_inner_wheel_brake_disc', 'front_wheel_brake_disc', 'rear_inner_wheel_brake_disc',
        'rear_wheel_brake_disc',
      ],
      ['aft_rear_axle', 'axle', 'front_axle', 'rear_axle'],
    ),
    fit(
      'A beam axle\'s diff housing and spring seats run into the rails or floor above it.',
      0.125,
      ['aft_rear_axle', 'axle', 'front_axle', 'rear_axle'],
      ['aft_shell', 'belly', 'chassis', 'frame', 'front_pivot', 'rear_body', 'shell'],
    ),
    fit(
      'A shaft ends inside the unit it drives or the shaft it joins.',
      0.04,
      [
        'aft_prop_shaft', 'front_prop_shaft', 'inter_axle_shaft', 'prop_shaft', 'rear_prop_shaft',
      ],
      [
        'aft_gearbox', 'aft_rear_axle', 'front_axle', 'gearbox', 'motor', 'prop_shaft', 'rear_axle',
        'rear_prop_shaft', 'shell', 'transfer_case',
      ],
    ),
    fit(
      'An exhaust starts at the engine and hangs from the body, so it shares a little volume with both.',
      0.08,
      ['aft_exhaust', 'catalytic_converter', 'exhaust'],
      [
        'aft_rear_axle', 'chassis', 'engine', 'frame', 'front_axle', 'gearbox', 'rear_axle', 'rear_bench',
        'shell',
      ],
    ),
    fit(
      'The engine sits in its bay: its sump and mounts run into the rails, axle and bonnet around it.',
      0.15,
      ['engine'],
      [
        'bonnet', 'cab', 'chassis', 'frame', 'front_axle', 'front_bumper', 'fuselage', 'gearbox', 'shell',
      ],
    ),
    fit(
      'The gearbox sits in the tunnel or bay between the rails: its case runs into the surrounding body block.',
      0.18,
      ['gearbox'],
      ['bonnet', 'cab', 'chassis', 'frame', 'shell', 'tub'],
    ),
    fit(
      'The dashboard is a block that fills the cowl of the cabin shell and the tunnel below it.',
      0.24,
      ['dashboard'],
      ['gearbox', 'shell', 'steering_column'],
    ),
    fit(
      'A fuel tank is slung in the rails or under the floor, so its shell runs into them.',
      0.15,
      ['fuel_tank', 'tank'],
      [
        'back', 'belly', 'body_floor', 'box_floor', 'chassis', 'frame', 'near_side', 'rear_bench', 'seat',
        'shell', 'skids', 'tailgate',
      ],
    ),
    fit(
      'The radiator stands in its opening and the panels around it close over its frame.',
      0.065,
      ['radiator'],
      [
        'body', 'bonnet', 'cab', 'chassis', 'dashboard', 'engine_cover', 'engine_hood', 'hood', 'house',
        'shell',
      ],
    ),
    fit(
      'The front bumper is a block let into the nose of the shell, with the radiator and the push bar behind it.',
      0.185,
      ['front_bumper'],
      ['push_bar', 'radiator', 'ram', 'shell'],
    ),
    fit(
      'The rear bumper wraps the end of the body and the exhaust tip.',
      0.09,
      ['rear_bumper'],
      ['box', 'exhaust', 'shell'],
    ),
    fit(
      'A door closes into the edge of the shell and of its neighbour, whose frames are drawn to the same line.',
      0.065,
      ['aft_door_aft', 'cab', 'door_aft', 'front_door'],
      ['aft_door_fwd', 'door', 'door_fwd', 'shell'],
    ),
    fit(
      'A windscreen and its frame are let into the shell\'s pillars.',
      0.075,
      ['instruments', 'screen_frame', 'windscreen', 'windscreen_frame'],
      ['far_side', 'near_side', 'roof', 'shell'],
    ),
    fit(
      'A seat or bench base is let into the floor, tunnel or tub it stands on.',
      0.125,
      ['bench', 'facing_seat', 'front_seat', 'rear_bench', 'seat'],
      ['cab', 'rear_door', 'shell', 'tub'],
    ),
    fit(
      'The destination sign is let into the roof line of the bus shell.',
      0.08,
      ['destination_sign'],
      ['shell'],
    ),
    fit(
      'A headlamp or lamp is let into the panel that carries it.',
      0.065,
      [
        'camera_ball', 'charge_port', 'headlamp', 'landing_lamp', 'searchlight', 'tail_lamp',
      ],
      [
        'belly', 'front_panel', 'front_wing', 'hull', 'inverter', 'rear_body', 'shell', 'tail_door',
      ],
    ),
    fit(
      'A front panel or bonnet closes over the shell\'s edge, its grille and the engine\'s top.',
      0.065,
      ['bonnet', 'front_panel'],
      ['chassis', 'cooling_fan', 'grille', 'radiator_hose_upper', 'shell'],
    ),
    fit(
      'A partition, bulkhead or floor is let into the walls it divides.',
      0.065,
      [
        'bed_floor', 'body_floor', 'body_front', 'box_floor', 'breast_bar', 'cockpit_bulkhead', 'dash',
        'floor', 'partition', 'tub_floor',
      ],
      [
        'bed_side', 'body_side', 'box_front', 'crew_door', 'front_pylon', 'fuselage', 'load_floor',
        'near_side', 'partition', 'rear_step', 'shell', 'side', 'tub_side',
      ],
    ),
    fit(
      'Side walls are let into the roof, floor and end panels they join.',
      0.09,
      ['back', 'far_side', 'front', 'near_side', 'rear', 'side'],
      ['chassis', 'far_side', 'front', 'near_side', 'roof'],
    ),
    fit(
      'A cladding plate or bolster is laid over the post it covers.',
      0.065,
      ['bolster', 'plate'],
      ['side', 'stake'],
    ),
    fit(
      'A part bolted to the rails sits a few centimetres into them.',
      0.08,
      [
        'air_box', 'alternator', 'backfill_blade', 'bumper', 'cab_back', 'grille', 'hitch', 'jockey_wheel',
        'motor', 'pack', 'radiator_hose_lower', 'rear_step', 'rear_underrun', 'resting_leg', 'screen_frame',
        'starter_motor', 'steering_box', 'tow_hitch',
      ],
      ['chassis', 'frame', 'inverter', 'motor', 'pack', 'rear_bench', 'rear_body'],
    ),
    fit(
      'A hull plate or hood closes over the hull edge.',
      0.065,
      ['glacis', 'hood', 'roof'],
      ['hull'],
    ),
    fit(
      'A tail boom takes its rotor, fin and cone, and the fairings run into it.',
      0.125,
      ['tail_boom'],
      [
        'cabin_rear', 'engine_cowl', 'rear_fairing', 'tail_cone', 'tail_rotor', 'tail_surfaces',
      ],
    ),
    fit(
      'A rotor is set on its mast and a gearbox on the mast or pylon it drives.',
      0.095,
      [
        'front_gearbox', 'front_rotor', 'main_gearbox', 'main_rotor', 'rear_gearbox', 'rear_rotor',
      ],
      [
        'front_mast', 'front_pylon', 'fuselage', 'mast', 'rear_fairing', 'rear_mast', 'rear_pylon', 'roof',
        'seat_frame',
      ],
    ),
    fit(
      'Engine cowls and turbines close over the airframe and each other.',
      0.125,
      [
        'cabin_door', 'cabin_rear', 'engine_cowl', 'engine_cowling', 'tail_cone', 'tail_section', 'turbine',
      ],
      [
        'cabin_door', 'main_gearbox', 'mast', 'rear_fairing', 'roof', 'tail_cone', 'tail_gear',
        'tail_section', 'tail_surfaces', 'turbine',
      ],
    ),
    fit(
      'A canopy and its frame close onto the seats and the fairing.',
      0.065,
      ['canopy', 'canopy_frame'],
      ['canopy_frame', 'door', 'rear_fairing', 'seat', 'seat_frame'],
    ),
    fit(
      'A skid, pylon or window is let into the fuselage it is mounted on.',
      0.095,
      [
        'belly', 'cabin_windows', 'cowling', 'front_pylon', 'fuselage', 'rear_pylon', 'skids', 'sponson',
      ],
      ['fuselage', 'skids', 'sponson', 'tail_section', 'windscreen'],
    ),
    fit(
      'A ram\'s end is pinned inside the lug of the part it moves.',
      0.12,
      ['arm_ram', 'boom_ram', 'bucket_ram', 'derrick_ram', 'lift_ram', 'tilt_ram'],
      ['arm', 'boom', 'bucket', 'digging_boom', 'house', 'lift_arms', 'turret'],
    ),
    fit(
      'A boom, arm or bucket joint is pinned inside the part it turns on.',
      0.09,
      [
        'arm', 'basket', 'boom', 'boom_stage', 'bucket', 'cannon', 'fork', 'header', 'hook_block',
        'hydraulics', 'launcher', 'lift_arms', 'lower_boom', 'reel', 'ripper',
      ],
      [
        'arm', 'boom', 'bucket', 'feeder', 'frame', 'hook_block', 'insulated_boom', 'leg_shield',
        'lift_arms', 'line', 'mast', 'ripper_shank', 'sling', 'turret', 'weapon_station',
      ],
    ),
    fit(
      'A strut\'s knuckle or arm is pinned into the axle or body it hangs from.',
      0.05,
      ['front_strut'],
      ['front_axle', 'shell'],
    ),
    fit(
      'A landing-gear stub is set into the wheel rim it carries.',
      0.04,
      ['front_gear', 'main_gear', 'rear_gear'],
      [
        'first_axle_wheel', 'front_rim', 'front_wheel', 'last_axle_wheel', 'main_wheel', 'middle_wheel',
        'rear_inner_wheel', 'rear_rim', 'rear_wheel', 'rim_rear', 'wheel', 'wheel_front', 'wheel_front_up',
        'wheel_rear', 'wheel_rear_road', 'wheel_rear_up',
      ],
    ),
    fit(
      'A frame or chassis rail runs into the floor pan, tub or panel that it carries.',
      0.08,
      ['chassis', 'frame'],
      [
        'cab', 'cage', 'chain_case', 'floor', 'headlamp', 'leg_shield', 'rear_fenders', 'roll_bar',
        'saddle', 'shell', 'swingarm', 'tub',
      ],
    ),
  ],
}
