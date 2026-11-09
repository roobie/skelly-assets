// The ambulance with a motor beside its engine and a small pack between the frame rails under the box floor.
local powertrain = import 'powertrain.libsonnet';
local s = import 'ambulance.spec.libsonnet';
{
  parent: 'ambulance',
  sites(base): powertrain.hybrid(base, {
    motor: { part: 'traction_motor_car', at: [s.frontAxle + 0.13, 0.5, -0.45] },
    inverter: { part: 'inverter_car', at: [s.frontAxle + 0.13, 0.5, 0.52] },
    pack: { part: 'hybrid_pack', at: [-0.35, s.box.panLow - 0.16, 0] },
  }),
}
