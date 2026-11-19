import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { validate } from '@skelly/construct/assembly/validate.ts';
import { applyPoint } from '@skelly/construct/foundation/math.ts';
import { distanceWorld, localSolidBounds, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { describe, expect, it } from 'vitest';
import catalogue from '../../../../models/guns/tables/catalogue.json' with { type: 'json' };
import { AR15_FRAME, checkFrameTable, u } from '../src/gun/arModular/frame.ts';
import { AR_MODULAR_FAMILIES } from '../src/gun/arModular/index.ts';
import { arUpper } from '../src/gun/arModular/upper.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { exportGunGlb } from '../src/gun/exportGlb.ts';
import gunVoxel from '../src/gun/gunVoxel.json' with { type: 'json' };
import { isTriggerBlade } from '../src/gun/roundedTriggerGuard.ts';
import { readGlb } from './glbReader.ts';
import { itemsKept, loadDesignAssembly, loadDesigns } from './helpers.ts';

const FOLDER = join(import.meta.dirname, '../src/gun/arModular');
const AR15 = AR15_FRAME.table;

describe('modular AR', () => {
  it('imports nothing from the first AR', () => {
    // Any specifier naming the module, at any depth, whether imported, re-exported or loaded on demand.
    const firstAr = /(?:from\s*|import\s*\(\s*)['"](?:[^'"]*\/)?(?:arLayout|arFrames|templates)(?:\.ts)?['"]/;
    const offenders = readdirSync(FOLDER, { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => firstAr.test(readFileSync(join(FOLDER, file), 'utf8')));
    expect(offenders).toEqual([]);
    for (const specifier of [
      "import { a } from '../arLayout.ts'",
      "import { a } from '../../gun/arFrames'",
      "export * from '../templates.ts'",
      "await import('../arLayout.ts')",
    ]) {
      expect(firstAr.test(specifier), specifier).toBe(true);
    }
  });

  it('refuses a frame table with an unsourced measurement', () => {
    expect(() => checkFrameTable('t', { a: { mm: 1, source: 'sourced: x' } })).not.toThrow();
    expect(() => checkFrameTable('t', { a: { mm: 1 } })).toThrow(/t\.a/);
    expect(() => checkFrameTable('t', { a: { mm: 1, source: 'a guess' } })).toThrow();
    expect(() => checkFrameTable('t', { a: 1 })).toThrow(/t\.a/);
  });

  it('gives every item the sourced mass of its frame table', () => {
    const items = catalogue.parts.filter((entry) => entry.id.startsWith('ar15_'));
    expect(items.map(({ id }) => id).sort()).toEqual(Object.keys(AR15.masses).sort());
    for (const { id, massKg } of items) {
      const mass = AR15.masses[id];
      expect(massKg, id).toBe(mass?.kg);
      expect(mass?.source, id).toMatch(/^(sourced|derived): /);
    }
  });

  it('carries its thin features only at the detail grain', () => {
    const coarse: typeof gunDomain = {
      ...gunDomain,
      families: Object.fromEntries(
        Object.entries(gunDomain.families).map(([name, family]) => [
          name,
          Object.hasOwn(AR_MODULAR_FAMILIES, name)
            ? { ...family, build: (params) => ({ ...family.build(params), tags: [] }) }
            : family,
        ]),
      ),
    };
    expect(validate(loadDesignAssembly('ar15-carbine-free-float'), gunDomain).issues).toEqual([]);
    const issues = validate(loadDesignAssembly('ar15-carbine-free-float'), coarse).issues;
    expect(new Set(issues.filter(({ rule }) => rule === 'min-feature').flatMap(({ parts }) => parts))).toEqual(
      new Set(['upper', 'handguard', 'lower', 'gas-block', 'stock']),
    );
  });

  it('seats the STANAG magazine in its well without touching the walls', () => {
    const resolved = resolve(loadDesignAssembly('ar15-carbine-free-float'), gunDomain);
    expect(resolved.issues).toEqual([]);
    const solidsOf = (part: string) =>
      resolved.defs.get(part)!.solids.map((solid) => worldSolid(resolved.placed.get(part)!, solid));
    const walls = resolved.defs
      .get('lower')!
      .solids.filter(({ id }) => id.startsWith('well-'))
      .map((solid) => worldSolid(resolved.placed.get('lower')!, solid));
    const gap = Math.min(...solidsOf('magazine').flatMap((mag) => walls.map((wall) => distanceWorld(mag, wall))));
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThanOrEqual(u(AR15.lower.well.clearance) + 1e-6);
  });

  it('closes the buffer tower against the upper receiver, with no gap at the rear of the receiver', () => {
    const resolved = resolve(loadDesignAssembly('ar15-carbine-free-float'), gunDomain);
    const boundsOf = (part: string, solid: string) => {
      const def = resolved.defs.get(part)!;
      const placed = resolved.placed.get(part)!;
      return localSolidBounds(def.solids.find(({ id }) => id === solid)!).map((corner) => applyPoint(placed, corner));
    };
    const towerFront = boundsOf('lower', 'tower')[1]!;
    const upperRear = boundsOf('upper', 'receiver-body')[0]!;
    expect(towerFront[0]).toBeCloseTo(upperRear[0], 9);
  });

  it.each(['flat-top', 'carry-handle'])(
    "keeps every solid of the %s upper receiver ahead of its rear face, clear of the lower's buffer tower",
    (top) => {
      const upper = arUpper(AR15_FRAME).build({ top });
      const behind = upper.solids.filter((solid) => localSolidBounds(solid)[0][0] < u(AR15.upper.rearX) - 1e-9);
      expect(behind.map(({ id }) => id)).toEqual([]);
    },
  );

  it('draws the trigger blade smooth inside the voxelized lower, not as its voxels', () => {
    const { assembly, items } = loadDesigns().find(({ label }) => label === 'design ar15-carbine-free-float.json')!;
    const result = exportGunGlb(
      assembly,
      { id: 'ar_trigger_test', file: 'assets/models/ar_trigger_test.glb' },
      { appearanceProfile: 'ar' },
      { ...recipeVoxel({ voxel: gunVoxel }), items: itemsKept(assembly, items) },
    );
    if (!result.ok) {
      throw new Error(`export failed: ${JSON.stringify(result.error)}`);
    }
    const { json, floats } = readGlb(result.glb);
    const lower = json.nodes.find(({ extras }) => extras?.part === 'lower')!;
    const primitives = json.meshes[lower.mesh!]!.primitives;
    const blade = resolve(assembly, gunDomain)
      .defs.get('lower')!
      .solids.filter(({ id }) => isTriggerBlade(id));
    expect(blade.length).toBeGreaterThan(0);
    const smooth = primitives.filter(({ extras }) => extras?.voxelGrain === undefined);
    expect(smooth.map(({ extras }) => extras?.solids)).toEqual([blade.map(({ id }) => id)]);
    const voxels = primitives.filter(({ extras }) => extras?.voxelGrain !== undefined);
    expect(voxels.flatMap(({ extras }) => extras?.solids ?? []).filter(isTriggerBlade)).toEqual([]);
    // Below the guard's top bar the blade hangs in the open guard, where no voxel may draw it.
    const { metresPerUnit } = gunDomain.units;
    const guardTop = u(AR15.lower.triggerGuard.topY) * metresPerUnit;
    const corners = blade.map(localSolidBounds);
    const low = [0, 1, 2].map((axis) => Math.min(...corners.map(([min]) => min[axis]!)) * metresPerUnit);
    const high = [0, 1, 2].map((axis) => Math.max(...corners.map(([, max]) => max[axis]!)) * metresPerUnit);
    const inBlade = (p: readonly number[]) =>
      p[1]! < guardTop - 1e-6 && [0, 1, 2].every((axis) => p[axis]! > low[axis]! && p[axis]! < high[axis]!);
    const voxelPoints = voxels.flatMap(({ attributes }) => {
      const positions = floats(attributes.POSITION);
      return Array.from({ length: positions.length / 3 }, (_, i) => [...positions.subarray(i * 3, i * 3 + 3)]);
    });
    expect(voxelPoints.filter(inBlade)).toEqual([]);
  });
});
