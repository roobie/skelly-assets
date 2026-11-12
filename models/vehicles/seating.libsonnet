// How deep a vehicle part may sink into the parts around it, by the role of its site. A role is a site id without its
// `_near` / `_far` side and its number, so `wheel_front_near` and `wheel_front_far` are both `wheel_front`; `*` in a role
// matches any run of characters. Two parts at different sites overlap only when they share more than one voxel grain of
// depth (tools/siteOverlap.mjs), and a pair is allowed when the deeper of its two roles seats at least that far, so a part
// states its seating once for every vehicle that places it. The reasons are in docs/decisions/0014-site-overlap.md.
local seat(why, depth, roles) = { why: why, depth: depth, roles: roles };
{
  seats: [
    seat('A wheel is set over its axle or strut and a brake disc is set on it, so their solids pass through each other.', 0.125, ['*wheel*']),
    seat('A suspension strut, brake disc or axle runs into the hub and the body or chassis above it.', 0.09, ['*axle', 'front_strut', '*brake_disc']),
    seat('A shaft ends inside the gearbox, axle or case it drives, so the ends overlap.', 0.04, ['*prop_shaft', 'inter_axle_shaft']),
    seat('An exhaust leaves the engine or gearbox and hangs from the body, so it starts inside them.', 0.08, ['exhaust', 'catalytic_converter']),
    seat('A bumper wraps the end of the body and carries the radiator or exhaust tip in its recess.', 0.09, ['*bumper']),
    seat('The engine, gearbox and tank are modelled as blocks that fill their bay, so they reach into the frame and shell around it.', 0.155, ['engine', '*gearbox', 'fuel_tank']),
    seat('The radiator stands in its opening and the grille, bonnet and front panel close around it.', 0.065, ['radiator', 'front_panel', 'bonnet', 'headlamp']),
    seat('The dashboard, column, bench and seats are fitted into the cabin shell, which is a solid block there.', 0.185, ['dashboard']),
    seat('Cabin fittings are set into the cabin shell, which is a solid block there.', 0.13, ['rear_bench']),
    seat('Cabin fittings are set into the cabin shell, which is a solid block there.', 0.065, ['steering_column', '*door*', 'cab', 'windscreen', 'seat', 'seat_frame', 'front_seat', 'floor', 'box_floor', 'body_floor', 'partition', 'breast_bar', 'cockpit_bulkhead', 'windscreen_frame']),
    seat('A wall panel is set into the floor, roof and posts it joins, which run through its thickness.', 0.09, ['side', '*_side']),
    seat('A destination sign is let into the bus roof line.', 0.08, ['destination_sign']),
    seat('A stowed outrigger beam, a steady leg collar or a bench base slides into the box that houses it.', 0.125, ['*outrigger*', 'steady_front', 'facing_seat', 'bench', 'air_box']),
    seat('A chassis or frame carries parts in its rails and a shell closes around them, so they share a little volume.', 0.08, ['chassis', 'frame', 'subframe', 'aft_shell', 'carrier', 'alternator', 'pack', 'motor']),
    seat('A body panel is laid over the structure it covers by a few millimetres.', 0.065, ['shell', 'hull', 'roof', 'tub',  'rear_body', 'fuselage', 'plate', 'bolster', 'charge_port', 'bed_floor', 'tub_floor', 'body_front', 'carbody', 'near_side', 'far_side', 'mudguard', 'rim*', '*rim*', 'tail_lamp', 'roller_stand', 'deck_posts', 'tow_hitch', 'hitch', 'sling', 'straw_chopper', 'ammo_rack', 'counterweight', 'winch', 'tail_gear', 'downlink_dome', 'bellows', 'swing_arm', 'terrain_camera*', 'front_fenders', 'rear_fenders']),
    seat('A helicopter assembly is built into the airframe around it: rotors on masts, cowls on gearboxes and turbines, fairings on the boom.', 0.125, ['tail_boom', 'main_rotor', '*rotor', 'mast', '*mast', 'rear_pylon', 'front_pylon', 'tail_rotor', 'tail_surfaces', 'engine_cowl', 'engine_cowling', 'turbine', 'belly', 'skids', 'rear_fairing', 'landing_lamp', 'canopy', 'canopy_frame', 'cabin_windows']),
    seat('A pivot joint sinks into its mate: a ram into its lug, a boom into its turret, a bucket onto its arm.', 0.09, ['*ram*', '*boom*', 'arm', 'bucket', 'lift_arms', '*yoke', 'drum', 'house', 'header', 'saddle', 'ripper_shank', 'launcher', 'weapon_station', 'cannon', 'turret', 'hydraulics', 'hook_block', 'reel', 'fork', 'walkway', 'leg_shield', 'rear_step', 'guard', 'resting_leg', 'earth', 'nose', 'tail_cone', 'cabin_rear', 'air_box']),
  ],
}
