import { describe, expect, it } from 'vitest';
import { grown } from '../src/families/grown.ts';
import { growSkeleton } from '../src/growth/grow.ts';
import type { Species } from '../src/growth/species.ts';

const tree: Species = {
  seasons: 8,
  internode: 0.3,
  shootCap: 3,
  alpha: 2,
  lambda: 0.5,
  leaders: { count: 1, spread: 0 },
  branching: { angle: 45, phyllotaxis: 'spiral', divergence: 137.5, whorl: 1, budLife: 3, bole: 0.6 },
  direction: { previous: 1, light: 0.3, tropism: { leader: 0.2, lateral: 0 }, noise: 0.15, flatten: 0 },
  light: { model: 'shadow', depth: 5, a: 0.2, b: 2, perception: 90 },
  shedding: { threshold: 0.04, grace: 2 },
  pipe: { exponent: 2.2, tip: 0.01, flare: 1.3, sink: 0.05 },
  bark: { cull: 0.012, merge: 10 },
  foliage: { age: 2, clump: 0.3, squash: 0.5, crown: 0.5 },
};
const shrub: Species = {
  ...tree,
  seasons: 5,
  internode: 0.1,
  leaders: { count: 4, spread: 30 },
  light: {
    model: 'colonize',
    envelope: { centre: [0, 0, 0], radii: [0.8, 1, 0.8], floor: 0.05 },
    markers: 400,
    occupancy: 2,
    reach: 5,
    perception: 90,
  },
  shedding: null,
};
const params = (species: Species, seed: number) => ({ species: JSON.stringify(species), seed: String(seed) });

describe('grown family', () => {
  it('grows the same solids from the same species and seed, and other solids from another seed', () => {
    const once = JSON.stringify(growSkeleton(tree, 7));
    expect(JSON.stringify(growSkeleton(tree, 7))).toBe(once);
    expect(JSON.stringify(growSkeleton(tree, 8))).not.toBe(once);
  });

  it('never thins an axis toward its base, as the pipe model requires', () => {
    const { internodes, radius } = growSkeleton(tree, 3);
    internodes.forEach((node, i) => {
      if (node.alive && node.parent >= 0) expect(radius[node.parent]).toBeGreaterThanOrEqual(radius[i]!);
    });
  });

  it('keeps a colonizing shrub inside the space its markers fill, give or take a reach', () => {
    const { internodes } = growSkeleton(shrub, 1);
    const slack = 5 * shrub.internode;
    expect(internodes.length).toBeGreaterThan(20);
    for (const { end } of internodes) {
      expect(Math.hypot(end[0], end[2])).toBeLessThan(0.8 + slack);
      expect(end[1]).toBeLessThan(1 + slack);
    }
  });

  it('draws bark and leaves only, with nothing of a leaf below the ground', () => {
    const solids = grown(params(tree, 1));
    expect(new Set(solids.map(({ slot }) => slot))).toEqual(new Set(['bark', 'leaf']));
    for (const solid of solids) {
      if (solid.slot === 'leaf' && solid.kind === 'extruded-polygon') expect(solid.z[0]).toBeGreaterThanOrEqual(0);
    }
  });
});
