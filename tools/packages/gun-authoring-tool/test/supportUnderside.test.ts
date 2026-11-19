import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { describe, expect, it } from 'vitest';
import { GUN_ANCHORS } from '../src/gun/anchorData.ts';
import { GUN_ANCHOR_POLICY, selectGunAnchors } from '../src/gun/anchors.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { exportGunGlb } from '../src/gun/exportGlb.ts';
import gunVoxel from '../src/gun/gunVoxel.json' with { type: 'json' };
import { readGlb } from './glbReader.ts';
import { itemsKept, loadDesigns, type MutableAssembly, partTriangles } from './helpers.ts';

const ASSET = { id: 'support_underside_test', file: 'assets/models/support_underside_test.glb' };

/** Whether every part but `without` still hangs on the root once `without` is gone. */
const allHangWithout = (assembly: MutableAssembly, without: string): boolean => {
  const partOf = (end: string) => end.split('.')[0]!;
  const reached = new Set([assembly.root]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const { from, to } of assembly.connections) {
      const [a, b] = [partOf(from), partOf(to)];
      if (a === without || b === without || reached.has(a) === reached.has(b)) {
        continue;
      }
      reached.add(reached.has(a) ? b : a);
      grew = true;
    }
  }
  return Object.keys(assembly.parts).every((id) => id === without || reached.has(id));
};

/**
 * A design without its sight-axis parts: this test reads the forend, and a sight line needs its own profile. A part
 * others hang on stays even when it carries the sight axis, as a receiver or carry-handle upper with a built-in rear
 * sight does.
 */
const sightless = (assembly: Parameters<typeof exportGunGlb>[0]): typeof assembly => {
  const copy = structuredClone(assembly) as MutableAssembly;
  const resolved = resolve(copy, gunDomain);
  for (const [id, def] of resolved.defs) {
    if (def.axes.some(({ kind }) => kind === 'sight') && allHangWithout(copy, id)) {
      delete copy.parts[id];
      copy.connections = copy.connections.filter(
        ({ from, to }) => !(from.startsWith(`${id}.`) || to.startsWith(`${id}.`)),
      );
    }
  }
  return copy;
};

/** Every published design that selects a support anchor, with the part that declares it. */
const supportForends = loadDesigns().flatMap(({ label, assembly, items }) => {
  const selected = selectGunAnchors(resolve(assembly, gunDomain), GUN_ANCHORS, GUN_ANCHOR_POLICY);
  const partId = 'code' in selected ? undefined : selected.sourceParts?.support;
  return partId === undefined ? [] : [{ label, assembly, items, partId }];
});

describe('the exported support anchor rides the underside the voxelized file draws', () => {
  it('has support anchors to check', () => {
    expect(supportForends.length).toBeGreaterThan(0);
  });

  it.each(supportForends)(
    'sits on the forend part’s lowest drawn face: $label, $partId',
    ({ assembly, items, partId }) => {
      const trimmed = sightless(assembly);
      const result = exportGunGlb(
        trimmed,
        ASSET,
        { appearanceProfile: 'ar' },
        { ...recipeVoxel({ voxel: gunVoxel }), items: itemsKept(trimmed, items) },
      );
      if (!result.ok) {
        throw new Error(`export failed: ${JSON.stringify(result.error)}`);
      }
      const read = readGlb(result.glb);
      const triangles = partTriangles(read.json, read, partId);
      const lowest = Math.min(...triangles.flatMap((tri) => tri.map((p) => p[1]!)));
      expect(Number.isFinite(lowest), `${partId} draws faces`).toBe(true);
      // A hand copying the height would drift at the next re-export; the anchor must sit on the drawn underside.
      expect(result.modelEntry.anchors!.support![1]).toBeCloseTo(lowest, 6);
    },
  );
});
