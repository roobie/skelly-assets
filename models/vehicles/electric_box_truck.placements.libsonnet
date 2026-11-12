// The box truck on a battery: the motor drives the prop shafts from behind the old gearbox, two packs hang under the
// rails between the axles and the inverter takes the fuel tank's bracket, with the charge port on its outer face.
// The packs sit toward the near side, clear of the battery box on the far rail. The upper pack is the shorter car pack,
// because it must fit between the rear spring's front hanger and the motor, while the lower one hangs below the springs.
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
    pack: { part: 'traction_pack_car', at: [0.2, s.railBottom - 0.16, 0.1] },
    port: { part: 'charge_port', at: [s.tankX + 0.15, s.tankY + 0.04, s.side - 0.34 + 0.21] },
    add: [site.one('pack_lower', 'traction_pack_van', [-0.22, s.railBottom - 0.32, 0.1])],
  }),
  overlaps: [
    site.overlap('pack', 'pack_lower', 0.05,
      'The lead of the lower pack enters the case of the pack above it.'),
  ],
}
