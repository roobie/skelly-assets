// The double decker with a motor on its rear axle and a pack on the roof, because its low floor leaves no room beneath.
local powertrain = import 'powertrain.libsonnet';
local s = import 'double_decker.spec.libsonnet';
{
  title: 'Hybrid double-decker bus',
  parent: 'double_decker',
  sites(base): powertrain.hybrid(base, {
    motor: { part: 'traction_motor_large', at: [-1.7, 0.24, 0] },
    inverter: { part: 'inverter_large', at: [-3.4, 0.46, -0.46] },
    pack: { part: 'traction_pack_roof_small', at: [0, s.roof, 0] },
  }),
}
