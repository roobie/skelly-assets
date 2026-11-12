// The refuse truck with a motor behind its gearbox and a pack under the rails for stop-start collection rounds. The
// exhaust becomes a small stack behind the cab, because the pack and motor fill the height the long pipe runs at.
local site = import 'site.libsonnet';
local powertrain = import 'powertrain.libsonnet';
local s = (import 'truck-cab.libsonnet').spec(import 'refuse_truck.spec.libsonnet');
{
  title: 'Hybrid refuse truck',
  parent: 'refuse_truck',
  sites(base): powertrain.hybrid(base, {
    over: { exhaust: { part: 'exhaust_stack_small', at: [s.cabBack - 0.1, s.railTop, 0.52] } },
    motor: { part: 'traction_motor_large', at: [1.89, s.railBottom + 0.02 - 0.25, 0] },
    inverter: { part: 'inverter_large', at: [1.03, s.railBottom - 0.24, 0.9] },
    pack: { part: 'traction_pack_van', at: [0.33, s.railBottom - 0.16, 0] },
  }),
  overlaps: [
    site.overlap('chassis', 'pack',
      'A leaf spring on the rail is drawn through the case slung beneath it; the owner decides whether to move the case or shorten the spring.'),
  ],
}
