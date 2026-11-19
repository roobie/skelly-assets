import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly } from '@skelly/construct/assembly/schema.ts';
import { validate } from '@skelly/construct/assembly/validate.ts';
import { expect, it } from 'vitest';
import { actionOpenOffsets, resolveGunAction } from '../src/gun/actionDescription.ts';
import { ACTION_PART_ROLES, type GunPartFamily } from '../src/gun/actionRoles.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { exportGunGlb } from '../src/gun/exportGlb.ts';
import { buildLayers, disposeGroup } from '../src/viewer/scene.ts';
import { loadDesignAssembly, loadFixture } from './helpers.ts';

it('discovers the pump open-pose pair after receiver/carrier/forend renames without moving validation or export', () => {
  const original = loadFixture('archetype-pump-shotgun');
  const rename = (id: string): string =>
    ({ receiver: 'housing', 'bolt-carrier': 'slide', forend: 'pump-grip' })[id] ?? id;
  const endpoint = (ref: string): string => {
    const [id, port] = ref.split('.');
    return `${rename(id!)}.${port}`;
  };
  const assembly: Assembly = {
    ...original,
    root: rename(original.root),
    parts: Object.fromEntries(Object.entries(original.parts).map(([id, part]) => [rename(id), part])),
    connections: original.connections.map((connection) => ({
      ...connection,
      from: endpoint(connection.from),
      to: endpoint(connection.to),
    })),
  };
  const report = validate(assembly, gunDomain);
  expect(report.issues).toEqual([]);
  const before = [...report.resolved.placed].map(([id, pose]) => [id, pose.t]);
  const action = resolveGunAction(report.resolved)!;
  expect(action.cycle.fire).toBeUndefined();
  expect(action.carrier.modes).toEqual(['hand']);
  const offsets = actionOpenOffsets(action);
  expect([...offsets.keys()]).toEqual(['slide', 'pump-grip']);
  for (const offset of offsets.values()) {
    expect(offset[0]).toBeLessThan(0);
    expect(offset[1]).toBeCloseTo(0, 12);
    expect(offset[2]).toBeCloseTo(0, 12);
  }
  const layers = buildLayers(report, [], 'role', {}, 32, offsets);
  try {
    expect([...report.resolved.placed].map(([id, pose]) => [id, pose.t])).toEqual(before);
    const exported = exportGunGlb(assembly, { id: 'pump_test', file: 'assets/models/pump_test.glb' }, {});
    expect(exported.ok).toBe(true);
    if (!exported.ok) {
      throw new Error('pump export failed');
    }
    expect(exported.modelEntry.gun.action?.fire).toBeUndefined();
    expect(exported.modelEntry.gun.action?.parts.forend?.node).toBe('pump-grip:forend');
    expect([...resolve(assembly, gunDomain).placed].map(([id, pose]) => [id, pose.t])).toEqual(before);
  } finally {
    for (const group of Object.values(layers)) {
      disposeGroup(group);
    }
  }
});

it("couples the AR charging handle by role and fires at the carrier's own cyclic rate", () => {
  for (const [design, rpm] of [
    ['archetype-ar', 800],
    ['archetype-ar-large', 700],
  ] as const) {
    const assembly = loadDesignAssembly(design);
    const action = resolveGunAction(validate(assembly, gunDomain).resolved)!;
    expect(action.parts.handle?.def.tags).toContain(ACTION_PART_ROLES.handle);
    expect(action.cycle.rpm).toBe(rpm);
  }
});

it('finds the handle and the carrier by their tags, whatever their family is named', () => {
  const handle = gunDomain.families['ar-charging-handle']!;
  const carrier = gunDomain.families['bolt-carrier']!;
  const families: Record<string, GunPartFamily> = {
    ...gunDomain.families,
    'test-handle': {
      ...handle,
      name: 'test-handle',
      build: (params) => ({ ...handle.build(params), family: 'test-handle' }),
    },
    'test-carrier': {
      ...carrier,
      name: 'test-carrier',
      build: (params) => ({ ...carrier.build(params), family: 'test-carrier' }),
      cyclicRpm: () => 650,
    },
  };
  const original = loadDesignAssembly('archetype-ar');
  const assembly: Assembly = {
    ...original,
    parts: {
      ...original.parts,
      'charging-handle': { family: 'test-handle' },
      'bolt-carrier': { ...original.parts['bolt-carrier']!, family: 'test-carrier' },
    },
  };
  const action = resolveGunAction(resolve(assembly, { ...gunDomain, families }))!;
  expect(action.kind).toBe('ar');
  expect(action.carrier.id).toBe('bolt-carrier');
  expect(action.parts.handle?.id).toBe('charging-handle');
  expect(action.cycle.rpm).toBe(650);
});

it('names no AR frame table in the action description or the cycle', () => {
  for (const file of ['actionDescription.ts', 'cycle.ts']) {
    expect(readFileSync(join(import.meta.dirname, '..', 'src', 'gun', file), 'utf8')).not.toContain('arFrames');
  }
});
