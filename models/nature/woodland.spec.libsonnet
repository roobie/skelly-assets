// Static scenery in metres. Ground y=0 is authored, never the centre of the mesh bounds.
{
  rootFloor: -0.08,
  rockFloor: -0.16,
  rockGrain: 0.04,
  mossBase: 0.6,  // Material regions meet on a voxel plane, not halfway through a shared cell.
  trees: [
    { id: 'woodland_oak_spreading', title: 'Spreading woodland oak', form: 'oak', scale: [1, 1, 1], seed: 0, kg: 3600, grain: 0.08 },
    { id: 'woodland_oak_upright', title: 'Upright woodland oak', form: 'oak', scale: [0.7, 1.15, 0.73], seed: 0.7, kg: 3200, grain: 0.08 },
    { id: 'woodland_birch', title: 'Woodland birch', form: 'birch', scale: [1, 1, 1], seed: 0, kg: 900, grain: 0.06 },
    { id: 'woodland_pine', title: 'Woodland pine', form: 'pine', scale: [1, 1, 1], seed: 0, kg: 1400, grain: 0.08 },
    { id: 'woodland_oak_sapling', title: 'Woodland oak sapling', form: 'oak', scale: [0.3, 0.36, 0.3], seed: 1.3, kg: 45, grain: 0.04 },
    { id: 'woodland_pine_sapling', title: 'Woodland pine sapling', form: 'pine', scale: [0.32, 0.31, 0.32], seed: 0, kg: 30, grain: 0.04 },
  ],
  rocks: [
    { id: 'woodland_boulder_broad', title: 'Broad woodland boulder', centre: [-0.1, 0.85, 0], radii: [1.7, 1.15, 1.3], seed: 0.5, kg: 13000, moss: false },
    { id: 'woodland_boulder_upright', title: 'Upright woodland boulder', centre: [0, 1.36, 0], radii: [0.85, 1.6, 0.85], seed: 1.9, kg: 9000, moss: false },
    { id: 'woodland_boulder_low', title: 'Low mossy woodland boulder', centre: [0.1, 0.35, -0.1], radii: [1.35, 0.55, 1], seed: 3.1, kg: 4000, moss: true },
  ],
}
