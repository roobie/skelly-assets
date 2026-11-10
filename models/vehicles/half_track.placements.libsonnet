local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'half_track.spec.libsonnet';
local cooling = import 'cooling-kit.libsonnet';
local engine = import 'engine-kit.libsonnet';
local track = import 'track-kit.libsonnet';
local tracks = import 'tracks.libsonnet';
local wheel = import 'wheel-kit.libsonnet';
local engineName = 'i6_petrol_large';
// The beam axles' frame puts the hub 0.52 m above its origin (`machine-kit.libsonnet`, `driveAxle`).
local axleY(hub) = hub - 0.52;
// Each bogie carries two road wheels, so it is centred between them at their axle height in the track's centre plane.
local roadWheels = [w for w in tracks.half_track_track.wheels if w.key == 'roadWheel'];
local bogieAt(i) = [(roadWheels[2 * i].at[j] + roadWheels[2 * i + 1].at[j]) / 2 for j in [0, 1]] + [s.trackZ];
{
  // The engine and radiator are fitted as assemblies so each accessory is its own salvage. The transfer case splits the
  // drive: the short shaft forward under the engine to the steered axle, its own short shaft back to the rear axle.
  sites: [
    one('hull', 'half_track_hull'),
    one('hood', 'half_track_hood'),
    one('radiator_armour', 'half_track_radiator_armour'),
    one('windscreen', 'half_track_windscreen'),
    one('windscreen_armour', 'half_track_windscreen_armour'),
    one('rear_door', 'half_track_rear_door'),
    one('bumper', 'half_track_bumper'),
    one('unditching_roller', 'half_track_unditching_roller'),
    one('frame', 'half_track_frame'),
    one('dashboard', 'half_track_dashboard'),
    one('front_axle', 'half_track_front_axle', [s.frontAxle, axleY(s.hub), 0]),
    one('rear_axle', 'half_track_rear_axle', [s.rearAxle, 0, 0]),
  ] + engine.sites(engineName, [1.75, 0.66, 0], 'assembly')
  + cooling.sites(engine.radiator(engineName), [2.45, 0.8, 0], 'assembly') + [
    one('gearbox', 'gearbox_truck', [0.88, 0.46, 0]),
    one('transfer_case', 'half_track_transfer_case', [0.32, 0.3, 0]),
    one('front_shaft', 'prop_shaft_short', [1.13, 0.4, 0]),
    one('rear_shaft', 'half_track_rear_shaft', [-0.09, 0.5, 0]),
    one('exhaust', 'exhaust_military', [0.4, 0.5, -0.6]),
    one('pedestal', 'half_track_pedestal', [s.pedestalX, s.floor, 0]),
    one('steering_wheel', 'steering_wheel', [0.74, 1.36, -0.5]),
    one('gear_lever', 'gear_lever', [0.75, s.floor, 0]),
    one('tow_hitch', 'tow_hitch', [s.rear - 0.06, 0.66, 0]),
  ]
  + wheel.pair(site.kit, 'front_wheel', 'wheel_8_25_20', [s.frontAxle, s.hub, s.wheelZ], 'drum')
  + track.pair('half_track_track', [0, 0, s.trackZ], 'assembly')
  + std.flattenArrays([pair('bogie_' + i, 'half_track_bogie', bogieAt(i)) for i in std.range(0, std.length(roadWheels) / 2 - 1)])
  + pair('cab_door', 'half_track_cab_door')
  + pair('front_fender', 'half_track_front_fender')
  + pair('fuel_tank', 'half_track_fuel_tank')
  + pair('bench', 'half_track_bench')
  + pair('mine_rack', 'half_track_mine_rack')
  + pair('seat', 'army_jeep_seat', [0.42, s.floor, 0.5])
  + pair('headlamp', 'headlamp_military', [2.3, s.fenderTop, 0.7])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.03, 1.5, 0.8])
  + site.batteryBay('truck_battery_tray', [0.15, s.floor, 0]),
  tags: { 'vehicle-role': ['military'] },
}
