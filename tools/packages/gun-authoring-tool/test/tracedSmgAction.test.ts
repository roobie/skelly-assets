import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { boundsOfPoints, obbPolyhedron, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { describe, expect, it } from 'vitest';
import { BOLT_CARRIER_RUNNING_CLEARANCE_U, RECEIVER_SECTION_WALL_U } from '../src/gun/parts.ts';
import { TRACED_SMG_SECTIONS, type TracedSmgSection } from '../src/gun/tracedSmgSections.ts';
import { NINE_MM_CASE, owner, resolveDesign, worldXs } from './tracedSmgFixture.ts';

const worldBounds = (section: TracedSmgSection, family: string, solidId: string): readonly [Vec3, Vec3] => {
  const resolved = resolveDesign(`${section}.json`);
  const id = owner(resolved, family);
  const solid = resolved.defs.get(id)!.solids.find((entry) => entry.id === solidId)!;
  const world = worldSolid(resolved.placed.get(id)!, solid);
  return boundsOfPoints(('vertices' in world ? world : obbPolyhedron(world)).vertices) as readonly [Vec3, Vec3];
};

describe.each(Object.keys(TRACED_SMG_SECTIONS) as TracedSmgSection[])('the %s action', (section) => {
  const { receiver, barrel, bolt, ejectionPort } = TRACED_SMG_SECTIONS[section];
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

  const resolved = resolveDesign(`${section}.json`);
  const { keepOuts } = resolved.defs.get(owner(resolved, 'receiver'))!;
  const span = (id: string, axis: number) => {
    const { center, half } = keepOuts.find((entry) => entry.id === id)!.box;
    return [center[axis]! - half[axis]!, center[axis]! + half[axis]!] as const;
  };
  const [travelRear, travelFront] = span('bolt-travel', 0);
  // The closed bolt's face, carried back by the built travel, is where it stops in recoil.
  const faceAtRecoil = high[0] - (travelFront - travelRear);

  it('recoils the bolt’s face behind the magazine, so the next round can rise in front of it', () => {
    expect(faceAtRecoil).toBeLessThanOrEqual(Math.min(...worldXs(resolved, 'magazine')));
  });

  describe('its ejection port', () => {
    const port = { x: span('ejection', 0), y: span('ejection', 1) };
    // The spent case's head rides the bolt's face back.
    const headAtRecoil = faceAtRecoil;

    it('lies over the spent case at full recoil and clears it', () => {
      expect(port.x[0]).toBeLessThanOrEqual(headAtRecoil);
      expect(port.x[1]).toBeGreaterThanOrEqual(headAtRecoil + NINE_MM_CASE.lengthU);
      expect(port.y[0]).toBeLessThanOrEqual(-NINE_MM_CASE.widestDiameterU / 2);
      expect(port.y[1]).toBeGreaterThanOrEqual(NINE_MM_CASE.widestDiameterU / 2);
    });

    it('shows the closed bolt across its whole opening', () => {
      expect(low[0]).toBeLessThanOrEqual(port.x[0]);
      expect(high[0]).toBeGreaterThanOrEqual(port.x[1]);
      expect(low[1]).toBeLessThanOrEqual(port.y[0]);
      expect(high[1]).toBeGreaterThanOrEqual(port.y[1]);
    });

    it('is the table’s opening', () => {
      expect(port).toEqual(ejectionPort);
    });
  });
});
