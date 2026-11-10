import { describe, expect, it } from 'vitest';
import { loadCatalogue } from '../src/catalogue.ts';
import type { DensityBounds } from '../src/density.ts';
import { loadThingRecipe } from '../src/exports.ts';

// A 0.1 m cube on a 0.01 m grain draws exactly a thousand voxels, a litre, so bounds of 100-1000 kg/m3 allow 0.1-1 kg.
const GRAIN = 0.01;
const BOUNDS: DensityBounds = { min: 100, max: 1000 };
const cube = (massKg: number, material: string) =>
  loadCatalogue({
    units: { metresPerUnit: 1, grid: 0.001, bevel: 0 },
    facets: 12,
    defaultMaterial: material,
    items: [
      {
        id: 'cube',
        exportMass: 'parts',
        parts: [
          {
            id: 'body',
            family: 'compound',
            params: { pieces: JSON.stringify([{ id: 'block', kind: 'box', slot: 'body', min: [0, 0, 0], max: [0.1, 0.1, 0.1] }]) },
            massKg,
            finish: { body: material },
            ports: [],
          },
        ],
        connections: [],
      },
    ],
  });
const exportCube = (massKg: number, density: DensityBounds, material = 'steel-grey') => {
  const [row] = loadThingRecipe(
    [{ id: 'cube', kind: 'item', source: 'cube', voxel: { grain: GRAIN }, options: { mass: 'parts', density } }],
    cube(massKg, material),
  );
  return row!.generate();
};

describe('drawn density bounds', () => {
  it('pass a part whose mass its drawn voxels can plausibly weigh', () => {
    expect(() => exportCube(0.5, BOUNDS)).not.toThrow();
  });
  it('refuse a part heavier than its drawn voxels can plausibly weigh', () => {
    expect(() => exportCube(2, BOUNDS)).toThrow(/implausible/);
  });
  it('refuse a part lighter than its drawn voxels can plausibly weigh', () => {
    expect(() => exportCube(0.05, BOUNDS)).toThrow(/implausible/);
  });
  it('bound a voxel by the material it draws', () => {
    const glass = { ...BOUNDS, materials: { 'glass-clear': { max: 500 } } };
    expect(() => exportCube(0.7, glass, 'steel-grey')).not.toThrow();
    expect(() => exportCube(0.7, glass, 'glass-clear')).toThrow(/implausible/);
  });
  it('refuse bounds whose minimum lies above their maximum', () => {
    expect(() => exportCube(0.5, { min: 1000, max: 100 })).toThrow(/min above max/);
  });
});
