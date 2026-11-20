// Static scenery in metres. Ground y=0 is authored, never the centre of the mesh bounds.
{
  rootFloor: -0.08,
  rockFloor: -0.16,
  rockGrain: 0.04,
  mossBase: 0.6,  // Material regions meet on a voxel plane, not halfway through a shared cell.
  // Trees and shrubs grown from a species (grown.species.libsonnet) and a seed; the seed picks one tree of the habit.
  // They voxelize at the world's standard grain, wood and leaves alike, so a crown reads as blocky as the world it
  // stands in and a tree costs a few thousand triangles; a row's own `grain` overrides it. Shrubs take it too, though
  // their clumps are thinner than a cell and swell to it: a leaf shader's cutout lets a coarse clump read as leaves.
  grownGrain: 0.5,
  // A sparse crown a player can hide in, though not easily, and that a scene of many trees can afford; a row's own
  // `density` overrides it.
  grownDensity: 0.2,
  // What a search finds the drawn trees and the deadwood by (models/TAXONOMY.md); a grown row's are its species'. A
  // snag died standing, so it is both a tree and deadwood.
  keywords: { tree: ['tree'], deadwood: ['deadwood'] },
  grown: [
    { id: 'woodland_oak_spreading', title: 'Spreading woodland oak', species: 'broadleaf', seed: 1, kg: 3600 },
    { id: 'woodland_oak_upright', title: 'Upright woodland oak', species: 'upright', seed: 1, kg: 3200 },
    { id: 'woodland_birch', title: 'Woodland birch', species: 'birch', seed: 1, kg: 900 },
    { id: 'woodland_scots_pine', title: 'Woodland Scots pine', species: 'conifer', seed: 1, kg: 1400 },
    { id: 'woodland_spruce', title: 'Woodland spruce', species: 'spruce', seed: 1, kg: 1600 },
    { id: 'woodland_hazel', title: 'Woodland hazel shrub', species: 'hazel', seed: 1, kg: 8 },
    { id: 'woodland_shrub_low', title: 'Low woodland shrub', species: 'low', seed: 1, kg: 3 },
  ],
  // Drawn by hand: the cone pine #304 drew stands beside the grown pine as its own variant, and the saplings.
  trees: [
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
