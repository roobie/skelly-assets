// The box truck on a long-bonnet cab, as most Kodiak box trucks were built: the same box, rear axle and cab back, with
// the front axle carried forward under the bonnet onto a 5.2 m wheelbase. Its frame weighs the box truck's with the
// longer rails' extra steel, and its cab is a smaller shell than the cab-over's, with no engine doghouse or tilt gear.
(import 'box_truck.spec.libsonnet') + (import 'conventional-cab.libsonnet') + {
  chassisMass: 740, shellMass: 430,
  // The rear end is the box truck's, so the conventional fits its parts there.
  borrow: { _rear_underrun: 'box_truck_rear_underrun', _mudguard: 'box_truck_mudguard' },
}
