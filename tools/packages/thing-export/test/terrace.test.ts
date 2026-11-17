import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Domain, Resolved } from '@skelly/construct/assembly/schema.ts';
import { meshForSolid } from '@skelly/construct/shapes/mesh.ts';
import type { ExtrudedPolygonSolid, Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { describe, expect, it } from 'vitest';
import { drawnGeometry } from '../src/drawn.ts';
import { exportGlb } from '../src/glb.ts';
import { fillVoxels, type VoxelFill } from '../src/voxelize.ts';

const GRAIN = 0.1;

const fixture = (solids: readonly Solid[]): Resolved => {
  const domain: Domain = {
    name: 'fixture',
    units: { metresPerUnit: 1, grid: 1, bevel: 0 },
    axisRules: [],
    families: {
      shape: {
        name: 'shape',
        params: {},
        build: () => ({ family: 'shape', solids: [...solids], ports: [], keepOuts: [], axes: [] }),
      },
    },
  };
  const resolved = resolve(
    { name: 'fixture', root: 'body', parts: { body: { family: 'shape' } }, connections: [] },
    domain,
  );
  if (resolved.issues.length > 0) {
    throw new Error(JSON.stringify(resolved.issues));
  }
  return resolved;
};

const drawnFill = (solids: readonly Solid[]): VoxelFill => {
  const fill = drawnGeometry(fixture(solids), { voxelGrain: GRAIN }).voxels('body');
  if (!fill) {
    throw new Error('The fixture draws no voxels');
  }
  return fill;
};

/** Per voxel layer, the (x, z) cells filled on it. */
const layersOf = (fill: VoxelFill): Map<number, Set<string>> => {
  const layers = new Map<number, Set<string>>();
  for (const key of fill.cells.keys()) {
    const [x, y, z] = fill.cells.voxelOf(key);
    layers.set(y, (layers.get(y) ?? new Set()).add(`${x},${z}`));
  }
  return layers;
};

const sameCells = (a: Set<string> | undefined, b: Set<string> | undefined): boolean =>
  a !== undefined && b !== undefined && a.size === b.size && [...a].every((cell) => b.has(cell));

const write = (solids: readonly Solid[], voxelGrain?: number) => {
  const result = exportGlb({
    resolved: fixture(solids),
    ...(voxelGrain === undefined ? {} : { voxelGrain }),
    asset: { id: 'fixture', file: 'assets/models/fixture.glb' },
    palette: {
      familyColors: {},
      specialColors: {},
      fallbackColor: [0.5, 0.5, 0.5],
      fallbackFinish: { metallic: 0, roughness: 0.5 },
    },
  });
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }
  return result.glb;
};

// A square y prism whose +x face leans in 0.38 voxel per layer, standing a little above the lattice plane at 0 so its
// lowest step is cut short.
const leaning: ExtrudedPolygonSolid = {
  id: 'leaning',
  kind: 'extruded-polygon',
  axis: 'y',
  profile: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ],
  z: [0.03, 1.2],
  clip: [{ normal: [1, 0.38, 0], offset: 0.45 }],
  display: { bevel: false },
};
const terraced = (solid: ExtrudedPolygonSolid, layers: number): ExtrudedPolygonSolid => ({
  ...solid,
  display: { ...solid.display, terrace: layers },
});

describe('a terraced voxel copy', () => {
  it('fills every layer of a step with the same cells', () => {
    const layers = layersOf(drawnFill([terraced(leaning, 2)]));
    expect([...layers.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (let y = 0; y < 12; y += 2) {
      expect(sameCells(layers.get(y), layers.get(y + 1)), `layers ${y} and ${y + 1}`).toBe(true);
    }
    // Whole steps, not a slope smoothed out: the outline still moves from one step to the next.
    expect(sameCells(layers.get(0), layers.get(10))).toBe(false);
  });

  it('samples a solid without the hint as it did before', () => {
    const before = fillVoxels([meshForSolid(leaning, 0)], GRAIN, [0, 0, 0]);
    const layers = layersOf(drawnFill([leaning]));
    expect(layers).toEqual(layersOf(before));
    // The very slope that terracing steps: within a step's layer pair it already moves.
    expect([0, 2, 4, 6, 8, 10].some((y) => !sameCells(layers.get(y), layers.get(y + 1)))).toBe(true);
  });

  it('draws a solid with no leaning face as authored', () => {
    const upright: ExtrudedPolygonSolid = { ...leaning, clip: [{ normal: [1, 0, 0], offset: 0.37 }] };
    expect(write([terraced(upright, 2)], GRAIN)).toEqual(write([upright], GRAIN));
  });

  it('leaves the smooth copy as authored', () => {
    expect(write([terraced(leaning, 2)])).toEqual(write([leaning]));
  });

  it('writes the same file from the voxels its datums were read off as from its own sampling', () => {
    const solids = [terraced(leaning, 3)];
    const resolved = fixture(solids);
    const drawn = drawnGeometry(resolved, { voxelGrain: GRAIN });
    const file = (drawnVoxels?: typeof drawn.voxels) => {
      const result = exportGlb({
        resolved,
        voxelGrain: GRAIN,
        ...(drawnVoxels ? { drawnVoxels } : {}),
        asset: { id: 'fixture', file: 'assets/models/fixture.glb' },
        palette: {
          familyColors: {},
          specialColors: {},
          fallbackColor: [0.5, 0.5, 0.5],
          fallbackFinish: { metallic: 0, roughness: 0.5 },
        },
      });
      if (!result.ok) {
        throw new Error(JSON.stringify(result.error));
      }
      return result.glb;
    };
    expect(file(drawn.voxels)).toEqual(file());
    expect(file()).not.toEqual(write([leaning], GRAIN));
  });

  it('refuses a terracing solid in a merge group, which is sampled as one welded mesh', () => {
    const merged = (solid: ExtrudedPolygonSolid): ExtrudedPolygonSolid => ({
      ...solid,
      display: { ...solid.display, mergeGroup: 'hull' },
    });
    const box: Solid = {
      id: 'box',
      kind: 'box',
      box: { center: [0, -0.5, 0], half: [0.5, 0.5, 0.5] },
      display: { mergeGroup: 'hull' },
    };
    expect(() => write([merged(terraced(leaning, 2)), box], GRAIN)).toThrow(/merge group "hull"/);
  });
});

/**
 * A closed hollow frustum: four walls leaning in 0.38 voxel per layer, each a wedge from the axis cut between its outer
 * and inner planes as a continuous sloped plate is, on a floor and under a roof.
 */
const frustum = (layers?: number, wall = 0.25): Solid[] => {
  const [outer, slope, height, slab] = [1, 0.38, 1.2, 0.2];
  const directions: [number, number][] = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const walls = directions.map(([dx, dz], i): ExtrudedPolygonSolid => {
    const corner = (side: number): Vec2 => [2 * (dz + side * dx), 2 * (dx - side * dz)];
    const solid: ExtrudedPolygonSolid = {
      id: `wall_${i}`,
      kind: 'extruded-polygon',
      axis: 'y',
      // (z, x), counter-clockwise seen from above.
      profile: [[0, 0], corner(1), corner(-1)],
      z: [0, height],
      clip: [
        { normal: [dx, slope, dz], offset: outer },
        { normal: [-dx, -slope, -dz], offset: -(outer - wall) },
      ],
      display: { bevel: false },
    };
    return layers === undefined ? solid : terraced(solid, layers);
  });
  const level = (id: string, from: number, half: number): Solid => ({
    id,
    kind: 'box',
    box: { center: [0, from + slab / 2, 0], half: [half, slab / 2, half] },
  });
  return [...walls, level('floor', 0, outer), level('roof', height - slab, outer - slope * height)];
};

/** Whether the empty cells reached face to face from `start` stay inside the fill's box, sealed from the outside. */
const sealed = (fill: VoxelFill, start: readonly [number, number, number]): boolean => {
  const filled = new Set([...fill.cells.keys()].map((key) => fill.cells.voxelOf(key).join(',')));
  const { low, size } = fill.box;
  const seen = new Set([start.join(',')]);
  const stack = [start];
  while (stack.length > 0) {
    const at = stack.pop()!;
    if (at.some((cell, axis) => cell <= low[axis]! || cell >= low[axis]! + size[axis]! - 1)) {
      return false;
    }
    for (const axis of [0, 1, 2]) {
      for (const step of [-1, 1]) {
        const next = at.map((cell, i) => (i === axis ? cell + step : cell)) as [number, number, number];
        const key = next.join(',');
        if (!(filled.has(key) || seen.has(key))) {
          seen.add(key);
          stack.push(next);
        }
      }
    }
  }
  return true;
};

describe('a terraced closed shell', () => {
  // A cell in the hollow, above the floor and below the roof.
  const inside = [0, 5, 0] as const;

  it.each([undefined, 1, 2, 3])('stays sealed face to face with %s layers per step', (layers) => {
    const fill = drawnFill(frustum(layers));
    expect(fill.cells.keys().some((key) => fill.cells.voxelOf(key).join(',') === inside.join(','))).toBe(false);
    expect(sealed(fill, inside)).toBe(true);
  });

  // The check itself: a step moving the wall further than the wall is thick opens it at the step.
  it('opens where a step moves the wall further than it is thick', () => {
    expect(sealed(drawnFill(frustum(undefined, 0.12)), inside)).toBe(true);
    expect(sealed(drawnFill(frustum(4, 0.12)), inside)).toBe(false);
  });
});
