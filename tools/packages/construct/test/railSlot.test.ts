import { describe, expect, it } from 'vitest';
import { resolve } from '../src/assembly/resolve.ts';
import type { Domain, PartDef } from '../src/assembly/schema.ts';

const body = { id: 'body', kind: 'box', box: { center: [0, 0, 0], half: [0.25, 0.25, 0.25] } } as const;

const part = (family: string, ports: PartDef['ports']): Domain['families'][string] => ({
  name: family,
  params: {},
  build: () => ({ family, solids: [body], ports, keepOuts: [], axes: [] }),
});

/** A rail of four slots one unit apart along x, and a sight that stands on one of them. */
const railDomain: Domain = {
  name: 'rail-domain',
  units: { metresPerUnit: 0.001, grid: 0.05, bevel: 0.025 },
  axisRules: [],
  families: {
    rail: part('rail', [
      {
        id: 'rail',
        mount: 'rail-top',
        gender: 'female',
        pos: [0, 0, 0],
        normal: [0, 1, 0],
        up: [1, 0, 0],
        slots: { count: 4, pitch: 1 },
      },
    ]),
    sight: part('sight', [
      { id: 'base', mount: 'rail-top', gender: 'male', pos: [0, 0, 0], normal: [0, -1, 0], up: [1, 0, 0] },
    ]),
  },
};

const sightOn = (slot: number) =>
  resolve(
    {
      name: 'railed',
      root: 'rail',
      parts: { rail: { family: 'rail' }, sight: { family: 'sight' } },
      connections: [{ from: 'rail.rail', slot, to: 'sight.base' }],
    },
    railDomain,
  );

describe('rail slots', () => {
  it('counts a negative slot from the rail’s far end', () => {
    const fromEnd = sightOn(-1);
    expect(fromEnd.issues).toEqual([]);
    expect(fromEnd.placed.get('sight')).toEqual(sightOn(3).placed.get('sight'));
    expect(fromEnd.connections[0]!.conn.slot).toBe(3);
  });

  it('refuses a slot past either end', () => {
    for (const slot of [4, -5]) {
      expect(sightOn(slot).issues.map(({ message }) => message)).toContainEqual(
        expect.stringContaining(`slot ${slot} is outside rail.rail`),
      );
    }
  });
});
