local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'cv9040.spec.libsonnet';
local engine = import 'engine-kit.libsonnet';
local track = import 'track-kit.libsonnet';
local tracks = import 'tracks.libsonnet';
local turret = import 'turret-kit.libsonnet';
local roadWheels = [w for w in tracks.cv9040_track.wheels if w.key == 'roadWheel'];
{
  sites: [
    one('belly', 'cv9040_hull_belly'),
    one('nose', 'cv9040_hull_nose'),
    one('roof', 'cv9040_hull_roof'),
    one('rear', 'cv9040_hull_rear'),
    one('rear_door', 'cv9040_rear_door'),
    one('turret_ring', 'cv9040_turret_ring', [s.turretX, s.roofTop, 0]),
  ] + turret.sites('cv9040_turret', [s.turretX, s.roofTop + 0.05, 0], 'assembly')
  + engine.sites('v8_diesel_heavy', [s.engineX, s.floor, s.engineZ], 'assembly') + [
    one('radiator', engine.radiator('v8_diesel_heavy'), [0.3, s.floor, 0.35]),
    one('transmission', 'cross_drive_transmission', [s.transmissionX, 0.72, 0]),
    one('engine_deck', 'cv9040_engine_deck'),
    one('driver_hatch', 'apc_hatch', [1.4, s.roofTop, s.driverZ]),
    one('driver_seat', 'front_seat', [s.driverX, s.floor, s.driverZ]),
    one('ammo_rack', 'cv9040_ammo_rack'),
  ] + [
    one('driver_periscope_' + i, 'apc_periscope', [1.8, s.roofTop, s.driverZ + (i - 1) * 0.3])
    for i in std.range(0, 2)
  ]
  + track.pair('cv9040_track', [0, 0, s.trackZ], 'assembly')
  + std.flattenArrays([pair('road_arm_' + i, 'cv9040_road_arm', [roadWheels[i].at[0], roadWheels[i].at[1], 0]) for i in std.range(0, std.length(roadWheels) - 1)])
  + pair('side', 'cv9040_hull_side')
  + std.flattenArrays([pair('troop_seat_' + i, 'cv9040_troop_seat', [-2.8 + 0.5 * i, s.floor, s.wall - 0.05]) for i in std.range(0, 3)])
  + pair('fuel_tank', 'cv9040_fuel_tank')
  + pair('troop_hatch', 'apc_hatch', [-2.4, s.roofTop, 0.7])
  + pair('headlamp', 'headlamp_military', [2.95, 1.2, 1.25])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear, 1.45, 1.3])
  + site.batteryBay('truck_battery_tray', [0.0, s.floor, 0.55]),
  tags: { 'vehicle-role': ['military'] },
}
