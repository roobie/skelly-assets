local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'apc.spec.libsonnet';
local axlePart(i) = if i < 2 then 'apc_axle_steered' else 'apc_axle_driven';
{
  sites: [
    one('belly', 'apc_hull_belly'),
    one('nose', 'apc_hull_nose'),
    one('roof', 'apc_hull_roof'),
    one('rear', 'apc_hull_rear'),
    one('ramp', 'apc_ramp'),
    one('turret_ring', 'apc_turret_ring', [s.turretX, s.roofTop, 0]),
    one('turret', 'apc_turret', [s.turretX, s.roofTop + 0.1, 0]),
    one('cupola', 'apc_cupola', [-1.2, s.roofTop, 0.6]),
    one('driver_hatch', 'apc_hatch', [s.driverX, s.roofTop, s.driverZ]),
    one('engine_deck', 'apc_engine_deck'),
    one('engine', 'engine_i6_heavy_diesel', [1.95, 0.85, 0.47]),
    one('gearbox', 'gearbox_heavy', [0.95, 0.85, 0.47]),
    one('radiator', 'radiator_truck', [2.6, 1.0, 0.47]),
    one('exhaust', 'exhaust_military', [1.4, 1.85, 0.6]),
    one('driver_seat', 'front_seat', [s.driverX, s.floor, s.driverZ]),
    one('steering_wheel', 'steering_wheel', [s.driverX + 0.43, s.floor + 0.52, s.driverZ]),
    one('driver_panel', 'apc_driver_panel'),
    one('rifle_rack', 'apc_rifle_rack'),
    one('ammo_rack', 'apc_ammo_rack'),
    one('tow_hitch', 'tow_hitch', [s.rear - 0.125, 0.68, 0]),
  ]
  + [one('axle_' + i, axlePart(i), [s.axles[i], s.hub, 0]) for i in std.range(0, 3)]
  + std.flattenArrays([pair('wheel_' + i, 'wheel_military_22_5', [s.axles[i], s.hub, s.wheelZ]) for i in std.range(0, 3)])
  + pair('side', 'apc_hull_side')
  + std.flattenArrays([
    pair('plate_' + i, 'apc_applique', [s.plateFirst + s.platePitch * i, s.shelf + 0.1, s.side])
    for i in std.range(0, 4)
  ])
  + pair('stowage_bin', 'apc_stowage_bin')
  + pair('squad_hatch', 'apc_hatch', [-2.2, s.roofTop, 0.72])
  + pair('periscope_rear', 'apc_periscope', [-0.95, s.roofTop, 1.05])
  + pair('bench', 'apc_bench')
  + pair('wall_locker', 'apc_wall_locker')
  + pair('headlamp', 'headlamp_military', [s.nose + 0.03, 1.0, 0.95])
  + pair('fuel_tank', 'apc_fuel_tank', [s.rear - 0.14, 0.86, 0.94])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.14, 1.85, 0.95])
  + [
    one('driver_periscope_' + i, 'apc_periscope', [s.driverX + 0.42, s.roofTop, s.driverZ + (i - 1) * 0.32])
    for i in std.range(0, 2)
  ]
  + site.batteryBay('truck_battery_tray', [-2.75, s.floor + 0.3, 0.5]),
  tags: { 'vehicle-role': ['military'] },
}
