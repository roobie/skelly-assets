local site = import 'site.libsonnet';
local s = import 'sports_car.spec.libsonnet';
local seatX = s.cowl - 0.55;
local wheel(x, z) = { part: 'sports_car_wheel', at: [x, s.hubHeight, z] };
{
  title: 'Sports car',
  sites: (import 'car-sites.libsonnet')('sports_car', s, {
    drop: ['rear_bench'],
    over: {
      // The engine stands just ahead of the twist beam's cross member.
      engine: { part: 'engine_v6_petrol', at: [-0.83, 0.3, 0] },
      gearbox: { at: [-1.4, 0.3, 0] },
      radiator: { part: 'radiator_small', at: [s.front - 0.32, 0.26, 0] },
      fuel_tank: { at: [s.frontAxle - 0.05, 0.24, 0] },
      exhaust: { at: [s.rear + 0.46, 0.13, 0.42] },
      rear_axle: { at: [s.rearAxle, s.hubHeight - 0.316, 0] },
      steering_wheel: { at: [s.cowl - 0.4, s.waist - 0.16, -0.37] },
      front_strut_near: { part: 'sports_car_wishbone', at: [s.frontAxle, s.hubHeight, s.wheelZ - 0.1] },
      front_strut_far: { part: 'sports_car_wishbone', at: [s.frontAxle, s.hubHeight, 0.1 - s.wheelZ] },
      front_wheel_near: wheel(s.frontAxle, s.wheelZ),
      front_wheel_far: wheel(s.frontAxle, 0 - s.wheelZ),
      rear_wheel_near: wheel(s.rearAxle, s.wheelZ),
      rear_wheel_far: wheel(s.rearAxle, 0 - s.wheelZ),
      front_seat_near: { part: 'sports_car_bucket_seat', at: [seatX, s.floor, 0.4] },
      front_seat_far: { part: 'sports_car_bucket_seat', at: [seatX, s.floor, -0.4] },
      headlamp_near: { at: [s.front - 0.07, 0.53, 0.66] },
      headlamp_far: { at: [s.front - 0.07, 0.53, -0.66] },
    },
    add: [
      site.one('firewall', 'sports_car_firewall'),
      site.one('front_skirt', 'sports_car_front_skirt'),
      site.one('side_intake', 'sports_car_side_intake'),
      site.one('spoiler', 'sports_car_spoiler'),
    ],
  }),
  swingUnjudged: [
    site.swingUnjudged('boot_lid', 'shell', 0.0171, 'skin meets boot_side_near'),
    site.swingUnjudged('boot_lid', 'spoiler', 0.0196, 'skin meets upright_near'),
  ],
}
