// The SUV with a motor ahead of its engine and a small pack under the rear floor, beside the prop shaft.
local site = import 'site.libsonnet';
local powertrain = import 'powertrain.libsonnet';
local s = import 'suv.spec.libsonnet';
{
  title: 'Hybrid SUV',
  parent: 'suv',
  sites(base): powertrain.hybrid(base, {
    over: { front_bumper: { part: 'hybrid_suv_front_bumper' } },
    port: { part: 'charge_port', at: [s.rearAxle - 0.2, s.archTop + 0.05, s.side] },
    add: site.pair('badge', 'hybrid_badge', [s.cowl - 0.25, s.waist - 0.2, s.side])
         + [site.one('rear_badge', 'hybrid_badge_rear', [s.rear + 0.05, 1.0, 0.4])],
    motor: { part: 'traction_motor_car', at: [1.8, 0.55, 0] },
    inverter: { part: 'inverter_car', at: [1.8, 0.85, 0] },
    pack: { part: 'hybrid_pack', at: [-0.4, s.sill, -0.38] },
  }),
  unjudged: [
    site.unjudged('shell', 'pack', 0.08,
      'The floor_pan piece of suv_shell runs into the case piece of hybrid_pack.'),
  ],
}
