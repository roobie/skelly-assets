local site = import 'site.libsonnet';
local s = import 'golf_cart.spec.libsonnet';
{
  title: 'Golf cart',
  sites: [
    site.one('frame', 'golf_cart_frame'),
    site.one('front_cowl', 'golf_cart_front_cowl'),
    site.one('rear_body', 'golf_cart_rear_body'),
    site.one('canopy', 'golf_cart_canopy'),
    site.one('windscreen', 'golf_cart_windscreen'),
    site.one('bag_rack', 'golf_cart_bag_rack'),
    site.one('front_axle', 'golf_cart_front_axle'),
    site.one('rear_axle', 'golf_cart_rear_axle'),
    site.one('motor', 'traction_motor_light', [s.rearAxle + 0.2, s.hub, 0]),
    site.one('inverter', 'inverter_car', [-0.72, 0.42, 0]),
    site.one('pack', 'traction_pack_light', [-0.23, s.floor, 0]),
    site.one('charge_port', 'charge_port', [-0.2, 0.37, s.side]),
    site.one('seat', 'bench_seat_low', [-0.2, 0.6, 0]),
    site.one('steering_column', 'golf_cart_steering_column'),
    site.one('steering_wheel', 'steering_wheel_raked', [0.38, 1.1, -0.22]),
  ]
  + site.pair('step', 'golf_cart_step')
  + site.pair('front_wheel', 'wheel_145r10', [s.frontAxle, s.hub, s.wheelZ])
  + site.pair('rear_wheel', 'wheel_145r10', [s.rearAxle, s.hub, s.wheelZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [s.tail - 0.03, 0.4, 0.32])
  + site.headlamps(s.nose + 0.03, 0.42, 0.3),
  unjudged: [
    site.unjudged('front_cowl', 'steering_column', 0.032,
      'The column piece of golf_cart_front_cowl runs into the dash piece of golf_cart_steering_column.'),
    site.unjudged('rear_body', 'inverter', 0.125,
      'The tail piece of golf_cart_rear_body runs into the case piece of inverter_car.'),
    site.unjudged('rear_body', 'motor', 0.116,
      'The tail piece of golf_cart_rear_body runs into the reducer piece of traction_motor_light.'),
    site.unjudged('rear_body', 'pack', 0.185,
      'The seat_box piece of golf_cart_rear_body runs into the case piece of traction_pack_light.'),
  ],
}
