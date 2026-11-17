import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../src/foundation/math.ts';
import { clippedExtrudedPolygonPolyhedron } from '../src/shapes/geometry.ts';
import type { ClipPlane, ExtrudedPolygonSolid } from '../src/shapes/solid.ts';

// A plate authored by its corners carries the unnormalised normal of a cross product, so a clip plane's normal may have
// any length; only its direction and the ratio of its offset to that length say where it cuts.
const wedge = (clip: readonly ClipPlane[]): ExtrudedPolygonSolid => ({
  id: 'wedge',
  kind: 'extruded-polygon',
  axis: 'y',
  profile: [
    [0, 0],
    [0.1708, 0.6375],
    [-0.1708, 0.6375],
  ],
  z: [0, 0.0625],
  clip,
});

const xRange = (clip: readonly ClipPlane[]): readonly [number, number] => {
  const shape = clippedExtrudedPolygonPolyhedron(wedge(clip));
  if (!shape) {
    throw new Error('the wedge clipped to nothing');
  }
  const xs = shape.vertices.map((point) => point[0]);
  return [Math.min(...xs), Math.max(...xs)];
};

describe('clip planes', () => {
  it('cut at the same place whatever the length of their normal', () => {
    const at = 0.6256;
    const unit = xRange([{ normal: [1, 0, 0], offset: at }]);
    expect(unit[1]).toBeCloseTo(at, 12);
    for (const length of [0.1554, 0.5, 3]) {
      const normal: Vec3 = [length, 0, 0];
      const scaled = xRange([{ normal, offset: length * at }]);
      expect(scaled[0]).toBeCloseTo(unit[0], 12);
      expect(scaled[1]).toBeCloseTo(unit[1], 12);
    }
  });

  it('reject a zero-length normal rather than leave the solid unclipped', () => {
    expect(() => xRange([{ normal: [0, 0, 0], offset: 0.1 }])).toThrow(/normal/);
  });
});
