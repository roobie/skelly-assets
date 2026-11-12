import content from './featureVoxels.json' with { type: 'json' };

/** How many voxels a feature must span to read as itself; see `models/voxel-grains.libsonnet`, `featureVoxels`. */
export const FEATURE_VOXELS: number = content.featureVoxels;

/**
 * Whether a feature `thickness` thick spans at least `FEATURE_VOXELS` voxels of `grain`, both in one unit. A thinner
 * feature lands unevenly on the lattice, so the caller draws it another way; which way is the caller's choice.
 */
export const featureFitsGrain = (thickness: number, grain: number): boolean =>
  // Authored at exactly the boundary, a feature fits whatever rounding its product of decimals picks up.
  thickness >= FEATURE_VOXELS * grain * (1 - 1e-9);
