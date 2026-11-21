import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { boundsOfPoints, obbPolyhedron, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { describe, expect, it } from 'vitest';
import { BOLT_CARRIER_RUNNING_CLEARANCE_U, RECEIVER_SECTION_WALL_U } from '../src/gun/parts.ts';
import { TRACED_SMG_SECTIONS, type TracedSmgSection } from '../src/gun/tracedSmgSections.ts';
import { owner, resolveDesign } from './tracedSmgFixture.ts';

const worldBounds = (section: TracedSmgSection, family: string, solidId: string): readonly [Vec3, Vec3] => {
  const resolved = resolveDesign(`${section}.json`);
  const id = owner(resolved, family);
  const solid = resolved.defs.get(id)!.solids.find((entry) => entry.id === solidId)!;
  const world = worldSolid(resolved.placed.get(id)!, solid);
  return boundsOfPoints(('vertices' in world ? world : obbPolyhedron(world)).vertices) as readonly [Vec3, Vec3];
};

describe.each(Object.keys(TRACED_SMG_SECTIONS) as TracedSmgSection[])('the %s action', (section) => {
  const { receiver, barrel, bolt } = TRACED_SMG_SECTIONS[section];
  const [low, high] = worldBounds(section, 'bolt-carrier', 'carrier-body');

  it('closes the bolt on the breech, its length the table’s', () => {
    expect(high[0]).toBeCloseTo(barrel.breechU, 6);
    expect(high[0] - low[0]).toBeCloseTo(bolt.lengthU, 6);
  });

  it('centres the bolt’s section on the bore, at the table’s size', () => {
    expect(low[1]).toBeCloseTo(-bolt.halfHeightU, 6);
    expect(high[1]).toBeCloseTo(bolt.halfHeightU, 6);
    expect(low[2]).toBeCloseTo(-bolt.halfWidthU, 6);
    expect(high[2]).toBeCloseTo(bolt.halfWidthU, 6);
  });

  it('keeps the bolt inside the receiver’s walls with its running clearance', () => {
    const inset = RECEIVER_SECTION_WALL_U + BOLT_CARRIER_RUNNING_CLEARANCE_U;
    expect(low[1]).toBeGreaterThanOrEqual(receiver.bottomU + inset);
    expect(high[1]).toBeLessThanOrEqual(receiver.topU - inset);
    expect(high[2]).toBeLessThanOrEqual(receiver.halfWidthU - inset);
  });
});
