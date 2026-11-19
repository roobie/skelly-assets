import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import { isSmoothPiece, SMOOTH } from '@skelly/thing-export/glb.ts';
import type { ModelExport } from '@skelly/thing-export/recipe.ts';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../src/cli/content.ts';
import { loadExportRecipe } from '../src/cli/exportRecipe.ts';
import { PART_CATALOGUE } from '../src/gun/catalogue.ts';
import type { DeadvoxModelEntry } from '../src/gun/exportGlb.ts';
import { FAMILIES } from '../src/gun/parts.ts';
import { readGlb } from './glbReader.ts';

const SOURCE_CONTEXT = /Export fixture.*fixture-source/;
const voxel = { grain: 0.004, detailGrain: 0.002, detailThinParts: true };

it.each(['fixture-unsupported', 'toString'])('refuses unknown export kind %s at recipe load', (kind) => {
  expect(() => loadExportRecipe([{ id: 'fixture', title: 'Fixture', kind, source: 'fixture-source', voxel }])).toThrow(
    'unknown export kind',
  );
});

it.each([
  { kind: 'design' },
  { kind: 'cartridge', options: { component: 'round' } },
  { kind: 'attachment' },
  { kind: 'magazine', options: { cartridge: 'fixture-cartridge.json', appearanceProfile: 'fixture' } },
])('refuses unresolved $kind sources at recipe load', (selection) => {
  expect(() =>
    loadExportRecipe([{ id: 'fixture', title: 'Fixture', source: 'fixture-source', voxel, ...selection }]),
  ).toThrow(SOURCE_CONTEXT);
});

it('rejects two rows owning the same output identity before resolving sources', () => {
  const row = { id: 'fixture', title: 'Fixture', kind: 'design', source: 'fixture-source', voxel };
  expect(() => loadExportRecipe([row, row])).toThrow('duplicate export id');
});

const designExport = (grains: { grain: number; detailGrain?: number }) => {
  const [exported] = loadExportRecipe([
    {
      id: 'fixture',
      title: 'Fixture',
      kind: 'design',
      source: 'models/guns/designs/archetype-ar.json',
      voxel: grains,
    },
  ]);
  return exported!.generate();
};

// Exported once at file load: a voxelized rifle export costs seconds under load, and both lattice tests read it.
const arExport = designExport(voxel);

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

/** A gun family's part built with its default params, or none for a family outside the gun catalogue. */
const defaultPart = (name: string): PartDef | undefined => {
  const family = FAMILIES[name];
  return family?.build(Object.fromEntries(Object.entries(family.params).map(([param, spec]) => [param, spec.default])));
};

/** Whether a family's part keeps its authored mesh in a voxelized export. */
const buildsSmooth = (name: string): boolean => defaultPart(name)?.tags?.includes(SMOOTH) ?? false;

/** Whether a family's part draws these of its solids as smooth pieces, as a smooth feature of a voxelized part. */
const smoothPieces = (name: string, solids: readonly string[]): boolean => {
  const part = defaultPart(name);
  return (
    part !== undefined &&
    solids.length > 0 &&
    solids.every((id) => part.solids.some((solid) => solid.id === id && isSmoothPiece(solid)))
  );
};

/** The family of each exported part node, with its mesh. */
const partNodes = (glb: Uint8Array) =>
  readGlb(glb).json.nodes.flatMap((node) => {
    const family = (node.extras as { family?: string } | undefined)?.family;
    return family === undefined ? [] : [{ family, mesh: node.mesh }];
  });

/** The family of each part a design names, through the catalogue for a catalogue item. */
const designFamilies = (source: string): string[] => {
  const { assembly } = JSON.parse(readFileSync(resolve(REPO_ROOT, source), 'utf8')) as {
    assembly: { parts: Record<string, { family?: string; item?: string }> };
  };
  return Object.values(assembly.parts).map(({ family, item }) => family ?? PART_CATALOGUE.items.get(item!)!.family);
};

/**
 * Whether a design's eye is on a sight part that keeps its authored mesh: a separate iron sight part, which the export
 * picks over a sight built into another part.
 */
const eyeOnSmoothSight = (source: string): boolean =>
  designFamilies(source).some(
    (family) => buildsSmooth(family) && defaultPart(family)!.axes.some(({ kind }) => kind === 'sight'),
  );

it('puts every part turned only by quarter turns, coarse or fine, on the fine lattice so the two grains nest', () => {
  const { json, floats } = readGlb(arExport.glb);
  const seen = new Set<number>();
  for (const node of json.nodes) {
    const transform = quarterTurned(node);
    if (node.mesh === undefined || transform === undefined) {
      continue;
    }
    for (const primitive of json.meshes[node.mesh]!.primitives) {
      const grain = (primitive.extras as { voxelGrain?: number }).voxelGrain;
      // A smooth part is drawn as authored, on no lattice.
      if (grain === undefined) {
        continue;
      }
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
    arExport as unknown as {
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
      const exported = row.generate();
      const { sight } = (
        exported.modelEntry as unknown as { gun: { sight?: { kind: string; eye: readonly number[] } } }
      ).gun;
      // A gun that ships without sights, its optic left for the player to fit, has no eye to check; a smooth sight's
      // eye is authored, off any lattice.
      if (sight?.kind !== 'iron' || eyeOnSmoothSight(row.source)) {
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
  // Each row is generated once for every check on it, since a gun takes seconds to write.
  const generated = new Map<string, ModelExport<DeadvoxModelEntry>>();
  const generatedOf = (row: (typeof rows)[number]) => {
    const model = generated.get(row.id) ?? row.generate();
    generated.set(row.id, model);
    return model;
  };
  it('has recipe rows to check', () => {
    expect(rows.length).toBeGreaterThan(0);
  });
  // A cartridge is a component too small to voxelize, like a smooth gun part, but outside the gun catalogue; see
  // `src/gun/tooSmallToVoxelize.ts`, `TOO_SMALL_TO_VOXELIZE`.
  it.for(rows)('draws $id on its row grain or detail grain, or smooth if a cartridge or smooth part', (row) => {
    const grains =
      row.kind === 'cartridge'
        ? [undefined]
        : [row.voxel.voxelGrain, row.voxel.voxelDetailGrain].filter((grain) => grain !== undefined);
    const { glb } = generatedOf(row);
    const { meshes } = readGlb(glb).json;
    expect(meshes.length, `${row.id}: no meshes`).toBeGreaterThan(0);
    // A loose part's node is named by the family its part builds, which need not be its catalogue family.
    const familyOf = (node: string) => (row.kind === 'part' ? PART_CATALOGUE.items.get(row.source)!.family : node);
    const meshFamilies = new Map(
      partNodes(glb).flatMap(({ family, mesh }) => (mesh === undefined ? [] : [[mesh, familyOf(family)] as const])),
    );
    meshes.forEach(({ primitives }, mesh) => {
      const family = meshFamilies.get(mesh);
      for (const { extras } of primitives) {
        const { voxelGrain, solids = [] } = (extras ?? {}) as { voxelGrain?: number; solids?: string[] };
        const smooth = family !== undefined && (buildsSmooth(family) || smoothPieces(family, solids));
        expect(smooth ? [undefined] : grains, `${row.id}: a mesh is not drawn on its part's grains`).toContain(
          voxelGrain,
        );
      }
    });
  });
  it.for(rows)('ships a smooth copy of $id with the same part nodes and no voxel grain', (row) => {
    const { glb, smoothGlb } = generatedOf(row);
    expect(partNodes(smoothGlb).map(({ family }) => family)).toEqual(partNodes(glb).map(({ family }) => family));
    const primitives = readGlb(smoothGlb).json.meshes.flatMap(({ primitives }) => primitives);
    expect(primitives.length, `${row.id}: no smooth primitives`).toBeGreaterThan(0);
    expect(
      primitives.some(({ extras }) => (extras as { voxelGrain?: number } | undefined)?.voxelGrain !== undefined),
    ).toBe(false);
  });
});

describe('loose smooth attachment seat', () => {
  const rows = loadExportRecipe().filter(({ kind, source }) => kind === 'attachment' && buildsSmooth(source));
  it('has smooth attachment rows to check', () => {
    expect(rows.length).toBeGreaterThan(0);
  });
  // The game fits a loose attachment by its mount frame at the gun's slot, where the gun's voxel rail top lies within
  // half a voxel of the port; reaching one grain through the port keeps it on the rail.
  it.for(rows)('reaches one row grain through the mount port of $id', (row) => {
    const { glb, modelEntry } = row.generate() as unknown as {
      glb: Uint8Array;
      modelEntry: { gun: { attachment: { mountFrame: { normal: readonly number[] } } } };
    };
    const { normal } = modelEntry.gun.attachment.mountFrame;
    const { json } = readGlb(glb);
    const reach = Math.max(
      ...json.nodes.flatMap((node) =>
        node.mesh === undefined
          ? []
          : json.meshes[node.mesh]!.primitives.map(({ attributes }) => {
              const { min, max } = json.accessors[attributes.POSITION!] as { min: number[]; max: number[] };
              const at = node.translation ?? [0, 0, 0];
              return Math.max(
                ...[min, max].map((corner) =>
                  corner.reduce((sum, value, axis) => sum + (value + at[axis]!) * normal[axis]!, 0),
                ),
              );
            }),
      ),
    );
    expect(reach).toBeCloseTo(row.voxel.voxelGrain, 9);
  });
});

it('refuses a detail grain the gun grain is not a whole multiple of', () => {
  expect(() => designExport({ grain: 0.005, detailGrain: 0.002 })).toThrow('nest');
});

it('rejects options not taken by the selected exporter', () => {
  expect(() =>
    loadExportRecipe([
      {
        id: 'fixture',
        title: 'Fixture',
        kind: 'design',
        source: 'fixture-source',
        voxel,
        options: { component: 'round' },
      },
    ]),
  ).toThrow('Invalid key');
});
