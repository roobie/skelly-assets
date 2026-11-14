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
    // The motor-generator starts the engine and charges the battery, so the hybrid carries no starter or alternator.
    drop: ['alternator', 'starter_motor'],
    // The motor stands low, under the air box beside the engine.
    motor: { part: 'traction_motor_car', at: [s.frontAxle - 0.02, 0.2, 0.38] },
    // The inverter sits on the transaxle, clear of the air box on the motor's side.
    inverter: { part: 'inverter_car', at: [s.frontAxle - 0.05, 0.6, -0.4] },
    pack: { part: 'hybrid_pack', at: [s.rearAxle - 0.5, 0.2, 0] },
  }),
}
