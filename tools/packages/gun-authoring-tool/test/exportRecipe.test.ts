import { Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { loadExportRecipe } from '../src/cli/exportRecipe.ts';
import { readGlb } from './glbReader.ts';

const SOURCE_CONTEXT = /Export fixture.*fixture-source/;
const voxel = { grain: 0.004, detailGrain: 0.002 };

it.each(['fixture-unsupported', 'toString'])('refuses unknown export kind %s at recipe load', (kind) => {
  expect(() => loadExportRecipe([{ id: 'fixture', kind, source: 'fixture-source', voxel }])).toThrow(
    'unknown export kind',
  );
});

it.each([
  { kind: 'design' },
  { kind: 'cartridge', options: { component: 'round' } },
  { kind: 'attachment' },
  { kind: 'magazine', options: { cartridge: 'fixture-cartridge.json', appearanceProfile: 'fixture' } },
])('refuses unresolved $kind sources at recipe load', (selection) => {
  expect(() => loadExportRecipe([{ id: 'fixture', source: 'fixture-source', voxel, ...selection }])).toThrow(
    SOURCE_CONTEXT,
  );
});

it('rejects two rows owning the same output identity before resolving sources', () => {
  const row = { id: 'fixture', kind: 'design', source: 'fixture-source', voxel };
  expect(() => loadExportRecipe([row, row])).toThrow('duplicate export id');
});

const designExport = (grains: { grain: number; detailGrain?: number }) => {
  const [exported] = loadExportRecipe([
    {
      id: 'fixture',
      kind: 'design',
      source: 'models/guns/designs/archetype-ak-akm.json',
      voxel: grains,
    },
  ]);
  return exported!.generate();
};

/** A node's transform when its rotation is a whole number of quarter turns, which keep the world lattice. */
const quarterTurned = (node: { translation?: number[]; rotation?: number[] }): Matrix4 | undefined => {
  const turn = new Matrix4().makeRotationFromQuaternion(
    new Quaternion(...((node.rotation ?? [0, 0, 0, 1]) as [number, number, number, number])),
  );
  if (turn.elements.some((entry) => Math.abs(entry - Math.round(entry)) > 1e-9)) {
    return undefined;
  }
  return turn.setPosition(...((node.translation ?? [0, 0, 0]) as [number, number, number]));
};

/** Every coordinate of a primitive's vertices once its node's transform has placed them. */
const placedCoordinates = (positions: ArrayLike<number>, transform: Matrix4): number[] =>
  Array.from({ length: positions.length / 3 }, (_, i) =>
    new Vector3(positions[3 * i]!, positions[3 * i + 1]!, positions[3 * i + 2]!).applyMatrix4(transform).toArray(),
  ).flat();

it('puts every part turned only by quarter turns, coarse or fine, on the fine lattice so the two grains nest', () => {
  const { json, floats } = readGlb(designExport(voxel).glb);
  const seen = new Set<number>();
  for (const node of json.nodes) {
    const transform = quarterTurned(node);
    if (node.mesh === undefined || transform === undefined) {
      continue;
    }
    for (const primitive of json.meshes[node.mesh]!.primitives) {
      const grain = (primitive.extras as { voxelGrain: number }).voxelGrain;
      seen.add(grain);
      for (const coordinate of placedCoordinates(floats(primitive.attributes.POSITION), transform)) {
        for (const step of [grain, voxel.detailGrain]) {
          expect(Math.abs(coordinate / step - Math.round(coordinate / step))).toBeLessThan(1e-3);
        }
      }
    }
  }
  expect([...seen].sort()).toEqual([voxel.detailGrain, voxel.grain]);
});

it('exports a voxelized sight whose up is perpendicular to its direction', () => {
  const { sight } = (
    designExport(voxel) as unknown as {
      modelEntry: { gun: { sight: { direction: readonly number[]; up: readonly number[] } } };
    }
  ).modelEntry.gun;
  const dot = sight.direction.reduce((sum, component, axis) => sum + component * sight.up[axis]!, 0);
  expect(Math.abs(dot)).toBeLessThan(1e-9);
});

describe('recipe iron sight lattice', () => {
  let ironSights = 0;
  afterAll(() => {
    if (ironSights === 0) {
      throw new Error('The recipe must exercise an iron sight');
    }
  });
  it.for(loadExportRecipe().filter(({ kind }) => kind === 'design'))(
    // A notch's eye is on a drawn top, a lattice plane; a closed aperture's is midway between its drawn rows, which
    // can be mid-row, so the half lattice holds both.
    'puts $id iron sight eye on a drawn top or aperture centre, on its fine half lattice',
    (row, context) => {
      const { sight } = (
        row.generate().modelEntry as unknown as { gun: { sight: { kind: string; eye: readonly number[] } } }
      ).gun;
      if (sight.kind !== 'iron') {
        context.skip();
        return;
      }
      ironSights += 1;
      const step = (row.voxel.voxelDetailGrain ?? row.voxel.voxelGrain) / 2;
      expect(Math.abs(sight.eye[1]! / step - Math.round(sight.eye[1]! / step)), row.id).toBeLessThan(1e-6);
    },
  );
});

describe('recipe output grain', () => {
  const rows = loadExportRecipe();
  it('has recipe rows to check', () => {
    expect(rows.length).toBeGreaterThan(0);
  });
  // A cartridge too small for its grain is drawn smooth as a whole; see `src/gun/cartridgeExport.ts`, `voxelized`.
  it.for(rows)('voxelizes $id on its row grain or detail grain, or a whole cartridge smooth', (row) => {
    const grains = [row.voxel.voxelGrain, row.voxel.voxelDetailGrain].filter((grain) => grain !== undefined);
    const primitives = readGlb(row.generate().glb).json.meshes.flatMap((mesh) => mesh.primitives);
    expect(primitives.length, `${row.id}: no meshes`).toBeGreaterThan(0);
    const drawn = primitives.map(({ extras }) => (extras as { voxelGrain?: number } | undefined)?.voxelGrain);
    if (row.kind === 'cartridge' && drawn.every((grain) => grain === undefined)) {
      return;
    }
    for (const grain of drawn) {
      expect(grains, `${row.id}: a mesh is not voxelized on the row's grains`).toContain(grain);
    }
  });
});

it('refuses a detail grain the gun grain is not a whole multiple of', () => {
  expect(() => designExport({ grain: 0.005, detailGrain: 0.002 })).toThrow('nest');
});

it('rejects options not taken by the selected exporter', () => {
  expect(() =>
    loadExportRecipe([
      { id: 'fixture', kind: 'design', source: 'fixture-source', voxel, options: { component: 'round' } },
    ]),
  ).toThrow('Invalid key');
});
