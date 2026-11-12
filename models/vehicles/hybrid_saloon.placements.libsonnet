// The saloon with a motor beside its engine and a small pack under the boot floor.
local site = import 'site.libsonnet';
local powertrain = import 'powertrain.libsonnet';
local s = import 'saloon.spec.libsonnet';
{
  title: 'Hybrid saloon',
  parent: 'saloon',
  sites(base): powertrain.hybrid(base, {
    over: { front_bumper: { part: 'hybrid_saloon_front_bumper' } },
    port: { part: 'charge_port', at: [s.rearAxle - 0.15, s.archTop + 0.05, s.side] },
    add: site.pair('badge', 'hybrid_badge', [s.cowl - 0.25, s.waist - 0.2, s.side])
         + [site.one('rear_badge', 'hybrid_badge_rear', [s.rear + 0.02, 0.8, 0.4])],
    motor: { part: 'traction_motor_car', at: [s.frontAxle - 0.02, 0.3, 0.38] },
    inverter: { part: 'inverter_car', at: [s.frontAxle - 0.05, 0.66, 0.38] },
    pack: { part: 'hybrid_pack', at: [s.rearAxle - 0.5, 0.2, 0] },
  }),
  unjudged: [
    site.unjudged('air_box', 'inverter', 0.055,
      'The box piece of air_box_light runs into the case piece of inverter_car.'),
    site.unjudged('alternator', 'motor', 0.058,
      'The case piece of alternator_light runs into the stator piece of traction_motor_car.'),
    site.unjudged('engine', 'inverter', 0.053,
      'The intake piece of engine_i4_petrol_core runs into the case piece of inverter_car.'),
    site.unjudged('starter_motor', 'motor', 0.042,
      'The motor piece of starter_motor_light runs into the reducer piece of traction_motor_car.'),
  ],
}
