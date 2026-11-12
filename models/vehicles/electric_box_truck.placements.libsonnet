// The box truck on a battery: the motor drives the prop shafts from behind the old gearbox, two packs hang under the
// rails between the axles and the inverter takes the fuel tank's bracket, with the charge port on its outer face.
// The packs sit toward the near side, clear of the battery box on the far rail.
local site = import 'site.libsonnet';
local powertrain = import 'powertrain.libsonnet';
local s = (import 'truck-cab.libsonnet').spec(import 'box_truck.spec.libsonnet');
{
  title: 'Electric box truck',
  parent: 'box_truck',
  sites(base): powertrain.electric(base, {
    over: { front_panel: { part: 'electric_box_truck_front_panel' } },
    motor: { part: 'traction_motor_large', at: [1.55, s.railBottom - 0.25, 0] },
    inverter: { part: 'inverter_large', at: [s.tankX + 0.15, s.tankY, s.side - 0.34] },
    pack: { part: 'traction_pack_van', at: [-0.22, s.railBottom - 0.16, 0.1] },
    port: { part: 'charge_port', at: [s.tankX + 0.15, s.tankY + 0.04, s.side - 0.34 + 0.21] },
    add: [site.one('pack_lower', 'traction_pack_van', [-0.22, s.railBottom - 0.32, 0.1])],
  }),
  unjudged: [
    site.unjudged('chassis', 'pack', 0.087,
      'The spring_1 piece of box_truck_chassis runs into the case piece of traction_pack_van.'),
    site.unjudged('inverter', 'charge_port', 0.06,
      'The case piece of inverter_large runs into the socket piece of charge_port.'),
    site.unjudged('pack', 'pack_lower', 0.05,
      'The case piece of traction_pack_van runs into the lead piece of traction_pack_van.'),
  ],
}
