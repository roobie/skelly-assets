import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { describe, expect, it } from 'vitest';
import { gunDomain } from '../src/gun/domain.ts';
import { SIGHT_ROLES, sightRoleOf } from '../src/gun/sightAxis.ts';

const defaults = (family: PartFamily): Record<string, string> =>
  Object.fromEntries(Object.entries(family.params).map(([name, spec]) => [name, spec.default]));

/**
 * The family built at its defaults and at every value of each param in turn. A combination its params check refuses is
 * skipped, since no design can build it; any other failure to build fails the test.
 */
const builds = (family: PartFamily): PartDef[] =>
  [
    defaults(family),
    ...Object.entries(family.params).flatMap(([name, spec]) =>
      spec.values.map((value) => ({ ...defaults(family), [name]: value })),
    ),
  ]
    .filter((params) => family.validateParams?.(params) === undefined)
    .map((params) => family.build(params));

describe('sight roles', () => {
  it('gives every sight axis of every family a role the domain knows', () => {
    const roles = new Set<string>();
    for (const [key, family] of Object.entries(gunDomain.families)) {
      for (const def of builds(family)) {
        for (const axis of def.axes.filter(({ kind }) => kind === 'sight')) {
          expect(SIGHT_ROLES, key).toContain(axis.role);
          roles.add(axis.role!);
        }
      }
    }
    // Every role is met, so the sweep reaches the sights it is meant to check.
    expect([...roles].sort()).toEqual([...SIGHT_ROLES].sort());
  });

  it('refuses a sight with no role or one the domain does not know', () => {
    const sight = (role?: string): PartDef => ({
      family: 'sight',
      solids: [],
      ports: [],
      keepOuts: [],
      axes: [{ kind: 'sight', ...(role === undefined ? {} : { role }), origin: [0, 0, 0], dir: [1, 0, 0] }],
    });
    expect(sightRoleOf(sight('rear'))).toBe('rear');
    expect(() => sightRoleOf(sight())).toThrow(/sight axis role/);
    expect(() => sightRoleOf(sight('raer'))).toThrow(/sight axis role/);
  });
});
