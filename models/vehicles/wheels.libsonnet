// The wheels built as a tyre on a rim, each braked by a brake of its class; see `wheel-kit.libsonnet`. A wheel is keyed
// by the id of its fused row, the tyre and rim as one model, which weighs what its tyre and rim do.
// The axis is z with +z outboard; a rim's `face` is where its spokes start, outboard of the hub's centre, and the brake
// sits inside the barrel behind it.
{
  wheel_205_55r16: {
    class: 'light',
    tyre: { id: 'tyre_205_55r16', massKg: 9, width: 0.205, outer: 0.316 },
    rim: { id: 'rim_16_alloy', massKg: 9, radius: 0.203, width: 0.165, wall: 0.02, face: 0.03, faceThickness: 0.03, hub: 0.085, spokes: 5, spokeWidth: 0.05, finish: 'paint-silver' },
  },
  // The 2014-2019 smart fortwo's staggered 15-inch alloys, narrower in front. Tyre and rim masses are estimates for
  // their sizes.
  wheel_165_65r15: {
    class: 'light',
    tyre: { id: 'tyre_165_65r15', massKg: 7, width: 0.165, outer: 0.298 },
    rim: { id: 'rim_15_alloy_narrow', massKg: 6.5, radius: 0.1905, width: 0.127, wall: 0.02, face: 0.03, faceThickness: 0.03, hub: 0.075, spokes: 6, spokeWidth: 0.04, finish: 'paint-silver' },
  },
  wheel_185_60r15: {
    class: 'light',
    tyre: { id: 'tyre_185_60r15', massKg: 7.5, width: 0.185, outer: 0.3015 },
    rim: { id: 'rim_15_alloy', massKg: 7, radius: 0.1905, width: 0.14, wall: 0.02, face: 0.03, faceThickness: 0.03, hub: 0.075, spokes: 6, spokeWidth: 0.04, finish: 'paint-silver' },
  },
  // A steel disc wheel: its wide spokes leave the hand holes between them.
  wheel_295_80r22_5: {
    class: 'heavy',
    tyre: { id: 'tyre_295_80r22_5', massKg: 58, width: 0.295, outer: 0.522 },
    rim: { id: 'rim_22_5_steel', massKg: 27, radius: 0.286, width: 0.21, wall: 0.025, face: 0.04, faceThickness: 0.03, hub: 0.14, spokes: 8, spokeWidth: 0.08, finish: 'steel-grey' },
  },
  // A 14.00 R25 flotation tyre on a 25-inch steel disc wheel, as off-road crash tenders and cranes run. Masses are
  // estimates for the size.
  wheel_385_95r25: {
    class: 'heavy',
    tyre: { id: 'tyre_385_95r25', massKg: 150, width: 0.385, outer: 0.685 },
    rim: { id: 'rim_25_steel', massKg: 85, radius: 0.3175, width: 0.254, wall: 0.03, face: 0.05, faceThickness: 0.035, hub: 0.16, spokes: 10, spokeWidth: 0.08, finish: 'steel-grey' },
  },
  // The M3 half-track's 8.25-20 combat tyre on a six-stud steel disc wheel. Masses are estimates for the size.
  wheel_8_25_20: {
    class: 'medium',
    tyre: { id: 'tyre_8_25_20', massKg: 45, width: 0.21, outer: 0.464 },
    rim: { id: 'rim_20_steel', massKg: 30, radius: 0.254, width: 0.17, wall: 0.025, face: 0.04, faceThickness: 0.03, hub: 0.12, spokes: 6, spokeWidth: 0.09, finish: 'paint-olive' },
  },
}
