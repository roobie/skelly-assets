// The city bus on a battery: the motor drives the prop shaft from the old gearbox bay and the pack rides on the roof,
// because a low floor leaves no room beneath it. The engine hatch goes with the engine.
local powertrain = import 'powertrain.libsonnet';
local s = import 'city_bus.spec.libsonnet';
{
  parent: 'city_bus',
  sites(base): powertrain.electric(base, {
    drop: ['engine', 'gearbox', 'radiator', 'fuel_tank', 'exhaust', 'rear_panel'],
    motor: { part: 'traction_motor_large', at: [-4.0, 0.3, 0] },
    inverter: { part: 'inverter_large', at: [-4.8, 0.32, 0] },
    pack: { part: 'traction_pack_roof', at: [1.0, s.roof, 0] },
    port: { part: 'charge_port', at: [-4.8, 0.62, s.side] },
  }),
}
