local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local s = import 'beach_buggy.spec.libsonnet';
{
  title: 'Beach buggy',
  sites: [
    site.one('frame', 'beach_buggy_frame'),
    site.one('tub', 'beach_buggy_tub'),
    site.one('roll_bar', 'beach_buggy_roll_bar'),
    site.one('windscreen', 'beach_buggy_windscreen'),
    site.one('dashboard', 'beach_buggy_dashboard'),
    site.one('front_axle', 'beach_buggy_front_axle'),
    site.one('rear_axle', 'beach_buggy_rear_axle'),
  ]
  // The engine stands raised over the frame's upper rails, so its air box stands higher than its class's, over a rail.
  + engine.sites('i4_petrol', [-1.12, 0.38, 0], 'assembly', airBox={ base: 0.5 }) + [
    site.one('gearbox', 'gearbox_transaxle', [s.rearAxle + 0.28, 0.3, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [-0.67, 0.6, 0]),
    site.one('exhaust', 'beach_buggy_exhaust'),
    site.one('steering_wheel', 'steering_wheel', [0.26, 0.69, -0.26]),
    site.one('gear_lever', 'gear_lever', [0.22, s.floor, 0]),
  ]
  + site.pair('step', 'beach_buggy_step')
  + site.pair('front_seat', 'beach_buggy_seat', [-0.05, s.floor, 0.26])
  + site.pair('front_wheel', 'beach_buggy_front_wheel', [s.frontAxle, s.frontHub, s.frontWheelZ])
  + site.pair('rear_wheel', 'beach_buggy_rear_wheel', [s.rearAxle, s.rearHub, s.rearWheelZ])
  + site.pair('headlamp', 'beach_buggy_headlamp')
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.02, 0.45, 0.44])
  + site.batteryBay('battery_tray', [-0.72, 0.3, 0.2]),
}
