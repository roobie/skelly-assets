import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { describe, expect, it } from 'vitest';
import { FEATURE_VOXELS } from '../src/featureFit.ts';
import { partVoxelGrain } from '../src/glb.ts';

const GRAIN = 0.004;
const DETAIL = 0.002;
const REFINED = { voxelGrain: GRAIN, voxelDetailGrain: DETAIL, voxelDetailThinParts: true };

const plate = (id: string, center: Vec3, size: Vec3): Solid => ({
  id,
  kind: 'box',
  box: { center, half: [size[0] / 2, size[1] / 2, size[2] / 2] },
});
const part = (...solids: Solid[]): PartDef => ({ family: 'fixture', solids, ports: [], keepOuts: [], axes: [] });

const span = FEATURE_VOXELS * GRAIN;
const thin = part(plate('bar', [0, 0, 0], [0.05, span * 0.99, span]));
const fits = part(plate('bar', [0, 0, 0], [0.05, span, span]));
// Two thin walls a block apart, as a receiver's sides are: the part is thick as a whole.
const walls = part(plate('left', [0, 0, -0.02], [0.05, 0.05, DETAIL]), plate('right', [0, 0, 0.02], [0.05, 0.05, DETAIL]));

describe('the grain a part is drawn at', () => {
  it('gives the detail grain to a part thinner on one axis than a feature needs, in a class that asks for it', () => {
    expect(partVoxelGrain(thin, REFINED, 1)).toBe(DETAIL);
    expect(partVoxelGrain(fits, REFINED, 1)).toBe(GRAIN);
  });

  it('judges the part whole, so thin walls that make a thick part keep the class grain', () => {
    expect(partVoxelGrain(walls, REFINED, 1)).toBe(GRAIN);
  });

  it('keeps a thin part on the class grain in a class that does not ask for it', () => {
    expect(partVoxelGrain(thin, { voxelGrain: GRAIN, voxelDetailGrain: DETAIL }, 1)).toBe(GRAIN);
  });
});
