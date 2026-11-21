import { IDENTITY } from '@skelly/construct/foundation/math.ts';
import { boxFromMinMax, localSolidBounds, penetrationWorld, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import { describe, expect, it } from 'vitest';
import { leaningFrame } from '../src/gun/tracedSmgProportions.ts';
import { TRACED_SMG_SECTION_NAMES, TRACED_SMG_SECTIONS } from '../src/gun/tracedSmgSections.ts';
import { owner, resolveDesign } from './tracedSmgFixture.ts';

/** A gap that clears the magazine without leaving it loose. */
const expectSnugClearance = (gap: number) => {
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThanOrEqual(0.25);
};
const cross = ([ax, ay]: Vec2, [bx, by]: Vec2): number => ax * by - ay * bx;
const dot = ([ax, ay]: Vec2, [bx, by]: Vec2): number => ax * bx + ay * by;

describe.each(TRACED_SMG_SECTION_NAMES)('the %s magazine well', (section) => {
  const { magazine, lower, receiver } = TRACED_SMG_SECTIONS[section];
  const { opening, leanDegrees } = lower.magwell;
  const resolved = resolveDesign(`${section}.json`);

  /** The unit direction of each edge of a part's traced prism, wound counter-clockwise. */
  const edgeDirections = (part: string, solidId: string): Vec2[] => {
    const solid = resolved.defs.get(part)!.solids.find(({ id }) => id === solidId)!;
    if (solid.kind !== 'extruded-polygon') {
      throw new Error(`${part}'s ${solidId} is a traced prism.`);
    }
    return solid.profile.map(([x0, y0], index) => {
      const [x1, y1] = solid.profile[(index + 1) % solid.profile.length]!;
      const length = Math.hypot(x1 - x0, y1 - y0);
      return [(x1 - x0) / length, (y1 - y0) / length];
    });
  };
  /** A traced prism's bottom face: wound counter-clockwise, it is the edge running most forward. */
  const bottomFace = (part: string, solidId: string): Vec2 =>
    edgeDirections(part, solidId).reduce((best, edge) => (edge[0] > best[0] ? edge : best));
  const expectSquare = (edges: readonly Vec2[]) => {
    for (const [index, edge] of edges.entries()) {
      expect(Math.abs(dot(edge, edges[(index + 1) % edges.length]!))).toBeLessThan(1e-9);
    }
  };
  const lastPiece = magazine.pieces.length;

  it('hugs the magazine’s straight top inside the well opening, front, rear and sides', () => {
    const across = magazine.pieces[0]!.map(leaningFrame(magazine.port, leanDegrees).across);
    expectSnugClearance(Math.min(...across) - opening.x[0]);
    expectSnugClearance(opening.x[1] - Math.max(...across));
    expectSnugClearance(opening.halfWidthU - magazine.halfWidthU);
  });

  it('builds the magazine’s top and floorplate square at every corner, the floorplate square to what it ends', () => {
    expectSquare(edgeDirections('magazine', 'body-1'));
    const plate = edgeDirections('magazine', `body-${lastPiece}`);
    expectSquare(plate);
    const joint = bottomFace('magazine', `body-${lastPiece - 1}`);
    for (const edge of plate) {
      expect(Math.min(Math.abs(cross(edge, joint)), Math.abs(dot(edge, joint)))).toBeLessThan(1e-9);
    }
  });

  it('cuts the well mouth square to the magazine’s straight top', () => {
    const top = bottomFace('magazine', 'body-1');
    expect(Math.abs(cross(bottomFace('lower', 'well-rear'), top))).toBeLessThan(1e-9);
    expect(Math.abs(cross(bottomFace('lower', 'well-front'), top))).toBeLessThan(1e-9);
  });

  it('keeps the magazine path an exact leaning prism, not a box', () => {
    const path = resolved.defs.get('lower')!.keepOuts.find(({ id }) => id === 'magazine-path')!;
    if (!(path.profile && path.z)) {
      throw new Error('The magazine path keeps its exact profile.');
    }
    const [min, max] = localSolidBounds({ id: path.id, kind: 'extruded-polygon', profile: path.profile, z: path.z });
    const box = boxFromMinMax(min, max);
    expect(path.box.center).toEqual(box.center);
    expect(path.box.half).toEqual(box.half);
  });

  it('opens the receiver floor over the whole well opening where the well meets it', () => {
    const { atLevel } = leaningFrame(magazine.port, leanDegrees);
    // A sliver of the opening, rear to front and side to side, just inside the floor, in the gun frame.
    const sliverU = 0.01;
    const [floorY, sliverTopY] = [receiver.bottomU, receiver.bottomU + sliverU];
    const sliver = worldSolid(IDENTITY, {
      id: 'opening-sliver',
      kind: 'extruded-polygon',
      profile: [
        atLevel(opening.x[0] + sliverU, sliverTopY),
        atLevel(opening.x[0] + sliverU, floorY),
        atLevel(opening.x[1] - sliverU, floorY),
        atLevel(opening.x[1] - sliverU, sliverTopY),
      ],
      z: [-opening.halfWidthU + sliverU, opening.halfWidthU - sliverU],
    });
    const shell = owner(resolved, 'receiver');
    for (const solid of resolved.defs.get(shell)!.solids) {
      expect(penetrationWorld(worldSolid(resolved.placed.get(shell)!, solid), sliver), solid.id).toBeLessThan(1e-9);
    }
  });
});
