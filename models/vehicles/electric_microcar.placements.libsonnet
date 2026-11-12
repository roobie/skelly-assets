// The microcar on a battery, as the 2017-2019 electric fortwo: the motor sits ahead of the rear axle where the engine
// did, and the pack lies under the floor pan.
local site = import 'site.libsonnet';
local powertrain = import 'powertrain.libsonnet';
local s = import 'microcar.spec.libsonnet';
{
  title: 'Electric microcar',
  parent: 'microcar',
  sites(base): powertrain.electric(base, {
    over: { shell: { part: 'electric_microcar_shell' }, front_bumper: { part: 'electric_microcar_front_bumper' } },
    motor: { part: 'traction_motor_car', at: [-0.7, 0.25, 0] },
    inverter: { part: 'inverter_car', at: [-1.08, 0.4, 0] },
    pack: { part: 'traction_pack_small', at: [(s.rearFloorFront + s.cowl) / 2, s.sill, 0] },
    port: { part: 'charge_port', at: [s.rearAxle, s.archTop + 0.05, s.side] },
  }),
  unjudged: [
    site.unjudged('shell', 'charge_port', 0.06,
      'The quarter_arch_near piece of electric_microcar_shell runs into the socket piece of charge_port.'),
    site.unjudged('shell', 'pack', 0.09,
      'The floor_pan piece of electric_microcar_shell runs into the case piece of traction_pack_small.'),
  ],
}
