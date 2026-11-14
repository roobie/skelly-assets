// The refuse truck with a motor behind its gearbox and a pack under the rails for stop-start collection rounds. The
// exhaust becomes a small stack behind the cab, because the pack and motor fill the height the long pipe runs at.
local site = import 'site.libsonnet';
local powertrain = import 'powertrain.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'refuse_truck.spec.libsonnet');
// The motor lies on the prop shaft's line just behind the crossmember behind the gearbox, its stator's front at the
// crossmember's back face.
local motorRadius = 0.25;
local motorX =
  local crossmembers = t.crossmembers(s);
  crossmembers[std.length(crossmembers) - 2] - t.crossmemberHalf - motorRadius;
{
  title: 'Hybrid refuse truck',
  parent: 'refuse_truck',
  sites(base): powertrain.hybrid(base, {
    over: { exhaust: { part: 'exhaust_stack_small', at: [s.cabBack - 0.1, s.railTop, 0.52] } },
    motor: { part: 'traction_motor_large', at: [motorX, s.propShaftY - motorRadius, 0] },
    inverter: { part: 'inverter_large', at: [1.03, s.railBottom - 0.24, 0.9] },
    // The pack fills the length between the rear springs' front hangers and the motor.
    pack: { part: 'traction_pack_car', at: [0.33, s.railBottom - 0.11, 0] },
  }),
}
