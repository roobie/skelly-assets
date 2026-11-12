import { describe, expect, it } from 'vitest';
import { FEATURE_VOXELS, featureFitsGrain } from '../src/featureFit.ts';

describe('a feature against a grain', () => {
  it.each([0.002, 0.004, 0.01])('fits from exactly the voxel span at %s m and not below it', (grain) => {
    expect(featureFitsGrain(FEATURE_VOXELS * grain, grain)).toBe(true);
    expect(featureFitsGrain((FEATURE_VOXELS - 0.01) * grain, grain)).toBe(false);
  });
});
