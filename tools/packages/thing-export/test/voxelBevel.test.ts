import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Domain } from '@skelly/construct/assembly/schema.ts';
import { meshForSolid } from '@skelly/construct/shapes/mesh.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { describe, expect, it } from 'vitest';
import { drawnGeometry } from '../src/drawn.ts';
import { exportGlb } from '../src/glb.ts';
import { fillVoxels } from '../src/voxelize.ts';

const GRAIN = 0.1;
// Two grains deep, as the guns' bevel is a large share of their voxels.
const BEVEL = 0.2;

// Two boxes that meet along one edge: both chamfers cut a notch into the union there.
const solids: Solid[] = [
  { id: 'a', kind: 'box', box: { center: [-0.5, 0, 0], half: [0.5, 0.5, 0.5] } },
  { id: 'b', kind: 'box', box: { center: [0.5, 0, 1], half: [0.5, 0.5, 0.5] } },
];

const fixture = (bevel: number) => {
  const domain: Domain = {
    name: 'fixture',
    units: { metresPerUnit: 1, grid: 1, bevel },
    axisRules: [],
    families: {
      shape: {
        name: 'shape',
        params: {},
        build: () => ({ family: 'shape', solids, ports: [], keepOuts: [], axes: [] }),
      },
    },
  };
  return resolve({ name: 'fixture', root: 'body', parts: { body: { family: 'shape' } }, connections: [] }, domain);
};

const write = (bevel: number, voxelGrain?: number) => {
  const result = exportGlb({
    resolved: fixture(bevel),
    ...(voxelGrain === undefined ? {} : { voxelGrain }),
    asset: { id: 'fixture', file: 'assets/models/fixture.glb' },
    palette: {
      familyColors: {},
      specialColors: {},
      fallbackColor: [0.5, 0.5, 0.5],
      fallbackFinish: { metallic: 0, roughness: 0.5 },
    },
  });
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }
  return result.glb;
};

const cellsOf = (fill: ReturnType<typeof fillVoxels>): string[] =>
  [...fill.cells.keys()].map((key) => fill.cells.voxelOf(key).join(',')).sort();

describe('the display bevel', () => {
  it('shapes the smooth file', () => {
    expect(write(BEVEL)).not.toEqual(write(0));
  });

  it('does not reach the voxel file, which samples the solids as authored', () => {
    expect(write(BEVEL, GRAIN)).toEqual(write(0, GRAIN));
  });

  it('does not reach the voxels the datums are read off, which fill the solids as authored', () => {
    const authored = fillVoxels(
      solids.map((solid) => {
        const { positions, indices } = meshForSolid(solid, 0);
        return { positions, indices };
      }),
      GRAIN,
    );
    const drawn = drawnGeometry(fixture(BEVEL), { voxelGrain: GRAIN }).voxels('body')!;
    expect(cellsOf(drawn)).toEqual(cellsOf(authored));
  });
});
