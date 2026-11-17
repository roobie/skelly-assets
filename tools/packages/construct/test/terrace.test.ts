import { describe, expect, it } from 'vitest';
import { boundsOfPoints } from '../src/shapes/geometry.ts';
import type { ExtrudedPolygonSolid, Solid } from '../src/shapes/solid.ts';
import { terraceBands } from '../src/shapes/terrace.ts';

const lattice = { layer: 0.1, base: 0.04 };

// The +x face leans in by 0.5 per unit of height; the section at the base is 1 across.
const wedge: ExtrudedPolygonSolid = {
  id: 'wedge',
  kind: 'extruded-polygon',
  axis: 'y',
  profile: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ],
  z: [0, 0.6],
  clip: [{ normal: [1, 0.5, 0], offset: 0.5 }],
  display: { bevel: false, terrace: 2 },
};

describe('terrace bands', () => {
  it('cuts a leaning solid at every other lattice boundary, each step its outline at the middle', () => {
    const bands = terraceBands(wedge, lattice)!;
    const spans = bands
      .map(({ vertices }) => boundsOfPoints(vertices))
      .map(([low, high]) => [low[1], high[1], high[0]]);
    const steps = [0, 0.04, 0.24, 0.44, 0.6];
    expect(spans).toHaveLength(steps.length - 1);
    spans.forEach(([from, to, x], i) => {
      expect(from).toBeCloseTo(steps[i]!, 12);
      expect(to).toBeCloseTo(steps[i + 1]!, 12);
      expect(x).toBeCloseTo(0.5 - 0.5 * ((from! + to!) / 2), 12);
    });
  });

  it('leaves a solid drawn as authored when it asks for none or has no leaning face', () => {
    const { terrace: _, ...plain } = wedge.display!;
    expect(terraceBands({ ...wedge, display: plain }, lattice)).toBeUndefined();
    expect(terraceBands({ ...wedge, clip: [{ normal: [1, 0, 0], offset: 0.3 }] }, lattice)).toBeUndefined();
    const box: Solid = { id: 'box', kind: 'box', box: { center: [0, 0, 0], half: [1, 1, 1] }, display: { terrace: 2 } };
    expect(terraceBands(box, lattice)).toBeUndefined();
  });

  it('steps by whole layers, and only extrusions', () => {
    expect(() => terraceBands({ ...wedge, display: { bevel: false, terrace: 1.5 } }, lattice)).toThrow(/whole number/);
    const turned: Solid = {
      id: 'cone',
      kind: 'revolved',
      profile: [
        [0, 0],
        [0, 1],
        [1, 0],
      ],
      display: { terrace: 2 },
    };
    expect(() => terraceBands(turned, lattice)).toThrow(/revolved/);
  });
});
