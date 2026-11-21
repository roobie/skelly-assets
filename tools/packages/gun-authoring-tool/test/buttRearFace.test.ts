import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { describe, expect, it } from 'vitest';
import { GUN_ANCHORS } from '../src/gun/anchorData.ts';
import { GUN_ANCHOR_POLICY, selectGunAnchors } from '../src/gun/anchors.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { FILE_AXES } from '../src/gun/exportFrame.ts';
import { exportGunGlb } from '../src/gun/exportGlb.ts';
import gunVoxel from '../src/gun/gunVoxel.json' with { type: 'json' };
import { readGlb } from './glbReader.ts';
import { itemsKept, loadDesigns, partTriangles } from './helpers.ts';

const ASSET = { id: 'butt_rear_face_test', file: 'assets/models/butt_rear_face_test.glb' };
const EPS = 1e-5;

/** Every published design that selects a butt anchor, with the stock that declares it. */
const buttStocks = loadDesigns().flatMap(({ label, assembly, items }) => {
  const selected = selectGunAnchors(resolve(assembly, gunDomain), GUN_ANCHORS, GUN_ANCHOR_POLICY);
  const partId = 'code' in selected ? undefined : selected.sourceParts?.butt;
  return partId === undefined ? [] : [{ label, assembly, items, partId }];
});

type Triangle = ReturnType<typeof partTriangles>[number];

/** Whether a triangle lying across the bore covers `point` seen along the bore, edges included. */
const covers = ([a, b, c]: Triangle, point: readonly number[]): boolean => {
  const { up, side } = FILE_AXES;
  const edge = (p: readonly number[], q: readonly number[]) =>
    (q[up]! - p[up]!) * (point[side]! - p[side]!) - (q[side]! - p[side]!) * (point[up]! - p[up]!);
  const turns = [edge(a, b), edge(b, c), edge(c, a)];
  return turns.every((t) => t >= -EPS) || turns.every((t) => t <= EPS);
};

/** Whether a triangle lies flat across the bore and its winding turns it back along the bore. */
const facesBack = ([a, b, c]: Triangle): boolean => {
  const { bore } = FILE_AXES;
  const u = (bore + 1) % 3;
  const v = (bore + 2) % 3;
  const turn = (b[u]! - a[u]!) * (c[v]! - a[v]!) - (b[v]! - a[v]!) * (c[u]! - a[u]!);
  return a[bore] === b[bore] && b[bore] === c[bore] && turn < 0;
};

describe('the exported butt anchor sits on the rear face the voxelized stock draws', () => {
  it('has butt anchors to check', () => {
    expect(buttStocks.map(({ label }) => label)).toEqual(
      expect.arrayContaining([
        'design archetype-ar.json',
        'design pipe-rifle.json',
        'design archetype-pump-shotgun.json',
        'design sks-carbine.json',
      ]),
    );
  });

  it.each(buttStocks)('is the rearmost drawn face over its middle: $label, $partId', ({ assembly, items, partId }) => {
    const result = exportGunGlb(
      assembly,
      ASSET,
      { appearanceProfile: 'ar' },
      { ...recipeVoxel({ voxel: gunVoxel }), items: itemsKept(assembly, items) },
    );
    if (!result.ok) {
      throw new Error(`export failed: ${JSON.stringify(result.error)}`);
    }
    const butt = result.modelEntry.anchors!.butt!;
    const read = readGlb(result.glb);
    const behind = partTriangles(read.json, read, partId).filter((t) => facesBack(t) && covers(t, butt));
    const rear = Math.min(...behind.map(([a]) => a[FILE_AXES.bore]!));
    // A shoulder meets the pad the file draws; a point in the air behind it or inside the wood would misplace the gun.
    expect(Number.isFinite(rear), `${partId} draws a rear face over the butt`).toBe(true);
    expect(butt[FILE_AXES.bore]).toBeCloseTo(rear, 5);
  });
});
