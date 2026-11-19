import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { validate } from '@skelly/construct/assembly/validate.ts';
import { applyPoint, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { distanceWorld, localSolidBounds, penetrationWorld, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { describe, expect, it } from 'vitest';
import catalogue from '../../../../models/guns/tables/catalogue.json' with { type: 'json' };
import { AR15_FRAME, checkFrameTable, checkRailSeats, FRAME_PICKS, pick, u } from '../src/gun/arModular/frame.ts';
import { AR_MODULAR_FAMILIES } from '../src/gun/arModular/index.ts';
import { arUpper } from '../src/gun/arModular/upper.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { exportGunGlb } from '../src/gun/exportGlb.ts';
import gunVoxel from '../src/gun/gunVoxel.json' with { type: 'json' };
import { isTriggerBlade } from '../src/gun/roundedTriggerGuard.ts';
import { readGlb } from './glbReader.ts';
import {
  itemsKept,
  LINE_HALF_THICKNESS,
  loadDesignAssembly,
  loadDesigns,
  loadFixtures,
  segmentBox,
  variant,
} from './helpers.ts';

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
    const kinds = { rifle: { mm: 1, source: 'sourced: x' } };
    const rifle = { choice: 'rifle', of: 'kinds' };
    // Every table below holds the picks its pins place, so each case tests only what it adds.
    const check =
      (extra: object, picks: object = { b: rifle }) =>
      () =>
        checkFrameTable('t', { kinds, picks, ...extra }, { 'picks.*': 'kinds' });
    expect(check({ a: { mm: 1, source: 'sourced: x' } })).not.toThrow();
    expect(check({ a: { mm: 1 } })).toThrow(/t\.a/);
    expect(check({ a: { mm: 1, source: 'a guess' } })).toThrow(/^t\.a: /);
    // A leaf its schema refuses is reported at its place, which valibot's own message does not name.
    expect(check({ a: { choice: 'rifle', of: 'kinds', mm: 1, source: 'sourced: x' } })).toThrow(/^t\.a: /);
    expect(check({ a: 1 })).toThrow(/t\.a/);
    expect(check({ a: 'rifle' })).toThrow(/t\.a/);
    // A pick names the group its place pins, which must hold it.
    expect(check({}, { b: { choice: 'rilfe', of: 'kinds' } })).toThrow(/t\.picks\.b/);
    expect(check({}, { b: { choice: 'rifle', of: 'sorts' } })).toThrow(/t\.picks\.b/);
    expect(check({ sorts: kinds }, { b: { choice: 'rifle', of: 'sorts' } })).toThrow(/not the kinds/);
    expect(check({ b: rifle })).toThrow(/t\.b: no pick belongs here/);
    expect(check({}, { b: { choice: 'rifle' } })).toThrow(/^t\.picks\.b: /);
    // A place the pins name holds a pick, and a pin names some place.
    expect(check({}, { b: rifle, c: { mm: 1, source: 'sourced: x' } })).toThrow(
      /t\.picks\.c: expected a pick from kinds/,
    );
    expect(check({}, {})).toThrow(/t\.picks\.\*: no place holds/);
    expect(() => checkFrameTable('t', { kinds, a: { b: kinds.rifle } }, { 'a.b': 'kinds' })).toThrow(
      /t\.a\.b: expected/,
    );
    expect(() => checkFrameTable('t', { kinds, a: {} }, { 'a.b': 'kinds' })).toThrow(/t\.a\.b: expected/);
    // A standard must be one its mount lists.
    expect(check({ a: { standard: 'ar15-magazine', mount: 'magazine' } })).not.toThrow();
    expect(check({ a: { standard: 'ar15-magzine', mount: 'magazine' } })).toThrow(/t\.a/);
    expect(check({ a: { standard: 'ar15-magazine', mount: 'stock' } })).toThrow(/t\.a/);
  });

  it('refuses a table whose rails would not stand on what carries them', () => {
    const withUpperTop = (mm: number) => ({ ...AR15, upper: { ...AR15.upper, topY: { ...AR15.upper.topY, mm } } });
    expect(() => checkRailSeats('ar15', AR15)).not.toThrow();
    expect(() => checkRailSeats('ar15', withUpperTop(AR15.upper.topY.mm + 1))).toThrow(/ar15\.upper\.topY/);
    const railTopY = { ...AR15.handguard.railTopY, mm: AR15.handguard.outerTopY.mm };
    expect(() => checkRailSeats('ar15', { ...AR15, handguard: { ...AR15.handguard, railTopY } })).toThrow(
      /ar15\.handguard\.outerTopY/,
    );
  });

  it('refuses the AR-15 table with a pick it pins left out or turned into a measurement', () => {
    const withBuffer = { ...AR15, stock: { ...AR15.stock, buffer: AR15.receiverExtension.buffers.carbine!.radius } };
    expect(() => checkFrameTable('ar15', withBuffer, FRAME_PICKS)).toThrow(/ar15\.stock\.buffer: expected a pick/);
    const { gas: _, ...gasless } = AR15.barrel.lengths['16-mid']!;
    const withoutGas = {
      ...AR15,
      barrel: { ...AR15.barrel, lengths: { ...AR15.barrel.lengths, '16-mid': gasless } },
    };
    expect(() => checkFrameTable('ar15', withoutGas, FRAME_PICKS)).toThrow(/16-mid\.gas: expected a pick/);
  });

  it('reads a pick from the group the pick names', () => {
    const buffer = { choice: 'carbine', of: 'receiverExtension.buffers' } as const;
    expect(pick(AR15_FRAME, buffer)).toBe(AR15.receiverExtension.buffers.carbine);
    expect(pick(AR15_FRAME, AR15.barrel.journal)).toBe(AR15.gasBlock.journals[AR15.barrel.journal.choice]);
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
    // Every stock style has sleeve walls under the coarse grain, the A2's as the collapsible's.
    const a2 = validate(loadDesignAssembly('ar15-rifle-a2'), coarse).issues;
    expect(a2.filter(({ rule }) => rule === 'min-feature').flatMap(({ parts }) => parts)).toContain('stock');
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

  it('refuses each broken modular AR for the reason a builder would give', () => {
    // The reason each broken-ar15-* fixture is built to show, by the rule that gives it.
    const reasons: Readonly<Record<string, readonly [string, string]>> = {
      'broken-ar15-carry-handle-rail': [
        'ar15-carry-handle-rail',
        'the carry-handle upper has no top rail: rear-sight needs the flat-top upper',
      ],
      'broken-ar15-drop-in-cap': [
        'ar15-drop-in-cap',
        'drop-in handguard needs a front sight base to hold its front; a low-profile gas block has no handguard cap',
      ],
      'broken-ar15-drop-in-gas': [
        'ar15-drop-in-gas',
        'mid-length drop-in handguard does not fit a rifle-length gas system; use the rifle-length drop-in',
      ],
      'broken-ar15-free-float-sight-base': [
        'ar15-free-float-sight-base',
        'free-float handguard (381 mm) runs past the front sight base at 218 mm; fit a low-profile gas block',
      ],
      'broken-ar15-magazine-well': [
        'port-compat',
        'Standard mismatch: lower.magazine is ar15-magazine but magazine.top is ar10-magazine.',
      ],
      'broken-ar15-rear-sight': [
        'ar15-rear-sight',
        'front sight base without a rear sight: add a rail rear sight or an optic',
      ],
      'broken-ar15-sight-height': [
        'ar15-sight-height',
        'flat-top front sight base does not match the rear sight on upper: its post stands 1.02 mm above the sight line',
      ],
      'broken-ar15-tube-stock': [
        'port-compat',
        'Standard mismatch: receiver-extension.stock is ar-tube-rifle but stock.front is ar-tube-carbine.',
      ],
    };
    const broken = loadFixtures().filter(({ name }) => name.startsWith('broken-ar15-'));
    expect(broken.map(({ name }) => name).sort()).toEqual(Object.keys(reasons).sort());
    for (const fixture of broken) {
      const [rule, message] = reasons[fixture.name]!;
      const messages = validate(fixture, gunDomain)
        .issues.filter((issue) => issue.rule === rule)
        .map((issue) => issue.message);
      expect(messages, fixture.name).toEqual([message]);
    }
  });

  it('aims a flat-top with only an optic past the front sight base, judging no iron sight line', () => {
    const optic = variant('broken-ar15-rear-sight', (assembly) => {
      assembly.parts.sight = { family: 'sight' };
      assembly.connections.push({ from: 'upper.rail', slot: 1, to: 'sight.base' });
    });
    const { resolved, issues } = validate(optic, gunDomain);
    expect(resolved.placed.has('sight')).toBe(true);
    const rules = issues.map(({ rule }) => rule);
    expect(rules).not.toContain('ar15-rear-sight');
    expect(rules).not.toContain('ar15-sight-height');
  });

  // The profile is only what the post stands on, so every profile must keep every height's post on its rear sight.
  const sightBaseFamily = gunDomain.families['ar15-front-sight-base']!;
  const sightMatrix = sightBaseFamily.params.profile!.values.flatMap((profile) =>
    sightBaseFamily.params.height!.values.flatMap((height) =>
      [
        { design: 'ar15-rifle-a2', rearHeight: 'carry-handle' },
        { design: 'ar15-carbine-front-sight', rearHeight: 'flat-top' },
      ].map((rear) => ({ profile, height, ...rear })),
    ),
  );
  it.each(sightMatrix)(
    'stands a $profile $height base on $design only at its own height, its line clear to the post',
    ({ profile, height, design, rearHeight }) => {
      const assembly = loadDesignAssembly(design);
      assembly.parts['front-sight-base']!.params = { height, profile };
      const { resolved, issues } = validate(assembly, gunDomain);
      expect(issues.filter(({ rule }) => rule === 'ar15-sight-height')).toHaveLength(height === rearHeight ? 0 : 1);
      if (height !== rearHeight) {
        return;
      }
      const sightOf = (part: string) => {
        const axis = resolved.defs.get(part)!.axes.find(({ kind }) => kind === 'sight')!;
        return applyPoint(resolved.placed.get(part)!, axis.origin);
      };
      const rearPart = design === 'ar15-rifle-a2' ? 'upper' : 'rear-sight';
      const eye = sightOf(rearPart);
      const post = sightOf('front-sight-base');
      const along = (x: number): Vec3 => [x, eye[1] + ((post[1] - eye[1]) * (x - eye[0])) / (post[0] - eye[0]), 0];
      // The line stops short of the post's rear face by its own half-thickness, so its end stays off the target.
      const line = segmentBox(
        eye,
        along(post[0] - u(AR15.frontSightBase.postWidth) / 2 - LINE_HALF_THICKNESS),
        LINE_HALF_THICKNESS,
      );
      // The rail rear sight's aperture is a ring, which penetration sees as its convex hull, hole and all, and the line
      // starts in that hole; so that one ring is left out. Every other solid, the A2's aperture plates included, is
      // tested.
      const isApertureRing = (id: string, solid: Solid) => id === rearPart && solid.kind === 'revolved';
      for (const [id, part] of resolved.defs) {
        const placed = resolved.placed.get(id)!;
        for (const solid of part.solids.filter((solid) => !isApertureRing(id, solid))) {
          expect(penetrationWorld(line, worldSolid(placed, solid)), `${id}.${solid.id}`).toBeLessThanOrEqual(0);
        }
      }
    },
  );

  it('takes a rail front sight for no rear sight', () => {
    const front = variant('broken-ar15-rear-sight', (assembly) => {
      assembly.parts['rail-front-sight'] = { family: 'rail-front-sight' };
      assembly.connections.push({ from: 'upper.rail', slot: 1, to: 'rail-front-sight.base' });
    });
    expect(validate(front, gunDomain).issues.map(({ rule }) => rule)).toEqual(['ar15-rear-sight']);
  });
});
