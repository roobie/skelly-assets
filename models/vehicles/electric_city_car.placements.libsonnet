// The city car on a battery: the motor sits where the engine did and the pack lies under the floor pan.
local powertrain = import 'powertrain.libsonnet';
local s = import 'city_car.spec.libsonnet';
{
  title: 'Electric city car',
  parent: 'city_car',
  sites(base): powertrain.electric(base, {
    over: { front_bumper: { part: 'electric_city_car_front_bumper' } },
    motor: { part: 'traction_motor_car', at: [s.frontAxle - 0.02, 0.24, 0] },
    inverter: { part: 'inverter_car', at: [s.frontAxle - 0.05, 0.56, 0.05] },
    pack: { part: 'traction_pack_car', at: [(s.rearFloorFront + s.cowl) / 2, s.sill, 0] },
    port: { part: 'charge_port', at: [s.rearAxle + 0.05, 0.72, s.side] },
  }),
}
