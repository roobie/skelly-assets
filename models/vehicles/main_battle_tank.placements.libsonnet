local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'main_battle_tank.spec.libsonnet';
local engine = import 'engine-kit.libsonnet';
local track = import 'track-kit.libsonnet';
local tracks = import 'tracks.libsonnet';
local turret = import 'turret-kit.libsonnet';
local roadWheels = [w for w in tracks.mbt_track.wheels if w.key == 'roadWheel'];
local sprocket = [w for w in tracks.mbt_track.wheels if w.key == 'sprocket'][0];
// The height of the upper glacis at x, for what stands on it.
local glacisY(x) = s.noseTop + (s.nose - x) * (s.roofTop - s.noseTop) / (s.nose - s.glacisTop);
{
  sites: [
    one('belly', 'mbt_hull_belly'),
    one('nose', 'mbt_hull_nose'),
    one('roof', 'mbt_hull_roof'),
    one('rear', 'mbt_hull_rear'),
    one('engine_deck', 'mbt_engine_deck'),
    one('turret_ring', 'mbt_turret_ring', [s.turretX, s.roofTop, 0]),
  ] + turret.sites('mbt_turret', [s.turretX, s.roofTop + 0.05, 0], 'assembly')
  + engine.sites('v12_diesel_tank', [s.engineX, s.floor, 0], 'assembly') + [
    one('radiator', engine.radiator('v12_diesel_tank'), [s.radiatorX, s.floor, 0]),
    one('transmission', 'mbt_transmission', [sprocket.at[0], sprocket.at[1], 0]),
    one('driver_hatch', 'apc_hatch', [s.driverX + 0.1, s.roofTop, 0]),
    one('driver_seat', 'front_seat', [s.driverX, s.floor, 0]),
    one('ammo_rack', 'mbt_hull_ammo_rack'),
  ] + [
    one('driver_periscope_' + i, 'apc_periscope', [s.driverX + 0.42, s.roofTop, (i - 1) * 0.3])
    for i in std.range(0, 2)
  ]
  + track.pair('mbt_track', [0, 0, s.trackZ], 'assembly')
  + std.flattenArrays([pair('road_arm_' + i, 'mbt_road_arm', [roadWheels[i].at[0], roadWheels[i].at[1], 0]) for i in std.range(0, std.length(roadWheels) - 1)])
  + pair('side', 'mbt_hull_side')
  + pair('side_skirt', 'mbt_side_skirt')
  + pair('fuel_tank', 'mbt_fuel_tank')
  + pair('headlamp', 'headlamp_military', [2.6, glacisY(2.6), 1.45])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear, 1.3, 1.6])
  + site.batteryBay('truck_battery_tray', [0.9, s.floor, 0.55]),
  tags: { 'vehicle-role': ['military'] },
}
