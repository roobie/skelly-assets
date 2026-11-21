import { GRID, TOLERANCE } from '@skelly/construct/foundation/conventions.ts';
import { IDENTITY, type Vec3 } from '@skelly/construct/foundation/math.ts';
import {
  boundsOfPoints,
  boxFromMinMax,
  distanceWorld,
  obbPolyhedron,
  penetrationWorld,
  worldSolid,
} from '@skelly/construct/shapes/geometry.ts';
import { describe, expect, it } from 'vitest';
import { resolveGunAction } from '../src/gun/actionDescription.ts';
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
  const { receiver, barrel, bolt, ejectionPort, cyclicRpm, chargingHandle } = TRACED_SMG_SECTIONS[section];
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

  it('fires one round per period of the published cyclic rate', () => {
    expect(resolveGunAction(resolved)!.cycle.fire!.durationSeconds).toBeCloseTo(60 / cyclicRpm, 12);
  });

  describe('its cocking tube', () => {
    const receiverId = owner(resolved, 'receiver');
    const handguardId = owner(resolved, 'handguard');
    const placedSolidsOf = (id: string, keep: (solidId: string) => boolean = () => true) =>
      resolved.defs
        .get(id)!
        .solids.filter((solid) => keep(solid.id))
        .map((solid) => ({ id: solid.id, shape: worldSolid(resolved.placed.get(id)!, solid) }));
    const receiverSolids = placedSolidsOf(receiverId);
    const tubeSolids = placedSolidsOf(handguardId, (id) => id.startsWith('smg-cocking-tube'));

    const { centreY, halfU, rearX } = chargingHandle.tube;
    // Only a tube that runs back into the receiver has a bore there to keep clear.
    it.runIf(rearX < receiver.frontX)('leaves its bore clear of the receiver where it runs back into it', () => {
      const boreHalf = halfU - GRID;
      const bore = worldSolid(IDENTITY, {
        id: 'tube-bore',
        kind: 'box',
        box: boxFromMinMax([rearX, centreY - boreHalf, -boreHalf], [receiver.frontX, centreY + boreHalf, boreHalf]),
      });
      for (const { id, shape } of receiverSolids) {
        expect(penetrationWorld(shape, bore), id).toBeLessThan(TOLERANCE.contact);
      }
    });

    it('touches the receiver without overlapping it', () => {
      const pairs = tubeSolids.flatMap((tube) => receiverSolids.map((solid) => [tube.shape, solid.shape] as const));
      expect(Math.max(...pairs.map(([tube, solid]) => penetrationWorld(tube, solid)))).toBeLessThan(TOLERANCE.contact);
      expect(Math.min(...pairs.map(([tube, solid]) => distanceWorld(tube, solid)))).toBeLessThan(TOLERANCE.contact);
    });
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
