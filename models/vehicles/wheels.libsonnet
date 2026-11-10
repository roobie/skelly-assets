// The wheels built as a tyre on a rim, each with its class's brake; see `wheel-kit.libsonnet`. A wheel is keyed by the
// id of its fused row, the tyre and rim as one model, which weighs what its tyre and rim do.
// The axis is z with +z outboard; a rim's `face` is where its spokes start, outboard of the hub's centre, and the brake
// sits inside the barrel behind it.
{
  wheel_205_55r16: {
    class: 'light',
    tyre: { id: 'tyre_205_55r16', massKg: 9, width: 0.205, outer: 0.316 },
    rim: { id: 'rim_16_alloy', massKg: 9, radius: 0.203, width: 0.165, wall: 0.02, face: 0.03, faceThickness: 0.03, hub: 0.085, spokes: 5, spokeWidth: 0.05, finish: 'paint-silver' },
  },
  // A steel disc wheel: its wide spokes leave the hand holes between them.
  wheel_295_80r22_5: {
    class: 'heavy',
    tyre: { id: 'tyre_295_80r22_5', massKg: 58, width: 0.295, outer: 0.522 },
    rim: { id: 'rim_22_5_steel', massKg: 27, radius: 0.286, width: 0.21, wall: 0.025, face: 0.04, faceThickness: 0.03, hub: 0.14, spokes: 8, spokeWidth: 0.08, finish: 'steel-grey' },
  },
}
