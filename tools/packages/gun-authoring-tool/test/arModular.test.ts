import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { validate } from '@skelly/construct/assembly/validate.ts';
import { applyPoint } from '@skelly/construct/foundation/math.ts';
import { distanceWorld, localSolidBounds, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { describe, expect, it } from 'vitest';
import catalogue from '../../../../models/guns/tables/catalogue.json' with { type: 'json' };
import { AR15_FRAME, checkFrameTable, u } from '../src/gun/arModular/frame.ts';
import { AR_MODULAR_FAMILIES } from '../src/gun/arModular/index.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { loadDesignAssembly } from './helpers.ts';

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
});
