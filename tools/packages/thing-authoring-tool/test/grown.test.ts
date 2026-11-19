import { clippedExtrudedPolygonPolyhedron } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { describe, expect, it } from 'vitest';
import { grown } from '../src/families/grown.ts';
import { growSkeleton } from '../src/growth/grow.ts';
import type { Species } from '../src/growth/species.ts';
import { thinned } from '../src/growth/thin.ts';

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
  density: 1,
  foliage: { age: 2, clump: 0.3, squash: 0.5, crown: 0.5, least: 2, core: 1, terrace: 2 },
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
const params = (species: Species, seed: number, density?: number) => ({
  species: JSON.stringify(species),
  seed: String(seed),
  grain: '0.04',
  ...(density === undefined ? {} : { density: String(density) }),
});
const DENSITIES = [1, 0.75, 0.5, 0.25];
/** The triangles a solid's smooth copy is drawn with: its convex faces fanned. */
const triangles = (solids: readonly Solid[]) =>
  solids.reduce((sum, solid) => {
    const shape = solid.kind === 'extruded-polygon' ? clippedExtrudedPolygonPolyhedron(solid) : undefined;
    return sum + (shape?.faces.reduce((n, face) => n + face.length - 2, 0) ?? 0);
  }, 0);
const inSlot = (solids: readonly Solid[], slot: string) => solids.filter((solid) => solid.slot === slot);

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

  it('draws the same solids again from the same species, seed and density', () => {
    for (const density of DENSITIES) {
      expect(JSON.stringify(grown(params(tree, 4, density)))).toBe(JSON.stringify(grown(params(tree, 4, density))));
    }
  });

  it('cuts at a sparser density everything a thicker one cuts, and keeps the trunk', () => {
    const skeleton = growSkeleton(tree, 5);
    const cuts = DENSITIES.map((density) => thinned(skeleton, density, 5));
    expect(cuts[0]!.size).toBe(0);
    cuts.slice(1).forEach((sparser, i) => {
      for (const index of cuts[i]!) expect(sparser.has(index)).toBe(true);
    });
    for (const root of skeleton.roots) expect(cuts.at(-1)!.has(root)).toBe(false);
  });

  // Eight trees grown in full: a second on an idle host, past the default timeout on a loaded one.
  it('draws no more clumps, tubes or triangles as it is drawn sparser', { timeout: 20_000 }, () => {
    for (const species of [tree, shrub]) {
      const drawn = DENSITIES.map((density) => grown(params(species, 2, density)));
      drawn.slice(1).forEach((sparser, i) => {
        const thicker = drawn[i]!;
        expect(inSlot(sparser, 'leaf').length).toBeLessThanOrEqual(inSlot(thicker, 'leaf').length);
        expect(inSlot(sparser, 'bark').length).toBeLessThanOrEqual(inSlot(thicker, 'bark').length);
        expect(triangles(sparser)).toBeLessThanOrEqual(triangles(thicker));
      });
      if (species === tree) expect(drawn.at(-1)!.length).toBeLessThan(drawn[0]!.length);
    }
  });

  it('draws a clump no thinner than its least voxels, however flat its species', () => {
    const flat = { ...tree, foliage: { ...tree.foliage, squash: 0.01 } };
    const grain = 0.04;
    const clumps = inSlot(grown({ ...params(flat, 1), grain: String(grain) }), 'leaf').filter(
      ({ id }) => !id.startsWith('leaf-core'),
    );
    for (const solid of clumps) {
      const shape = solid.kind === 'extruded-polygon' ? clippedExtrudedPolygonPolyhedron(solid) : undefined;
      const heights = shape?.vertices.map((v) => v[1]) ?? [];
      // A clump's extent along any direction is at least twice its least half-axis, unless the ground cuts it.
      if (Math.min(...heights) > 1e-9) {
        expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThanOrEqual(
          2 * flat.foliage.least * grain - 1e-9,
        );
      }
    }
  });
});
