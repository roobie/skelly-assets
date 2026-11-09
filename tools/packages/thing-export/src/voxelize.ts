// Samples closed triangle meshes onto a voxel grid and greedy-meshes the result. It knows nothing of assemblies or
// glTF: `glb.ts` feeds it one part's solids (metres, part-local) and writes what comes back.
//
// A solid is sampled by casting rays along each axis through the columns of voxel centres, nudged off the centres by a
// fixed fraction of a voxel so a ray never runs along a mesh edge. The nudge points toward the origin and a centre on a
// span's end counts as inside, so the sampling is mirror-symmetric about the origin: a surface that lies exactly on a
// row of centres, such as a 33 mm radius at a 2 mm grain, fills the same on both sides. The spans between paired crossings are filled, and a
// span too short to hold a centre keeps one voxel, inside the shape the sources make together (see `fillAlong`). Open
// meshes (an odd crossing count) drop the unpaired crossing. What the sources connect stays connected: bodies left
// apart are joined through the cells the sources meet, to each other and to neighbouring parts (see `bridge`).
//
// Cells live in arrays over the box the sources span rather than in maps keyed by lattice position: a part's solids fill
// much of their box, and an array cell costs a fraction of a map entry, which made voxelizing most of a build's time.

export interface VoxelSource {
  /** Part-local metres, three numbers per vertex. */
  readonly positions: ArrayLike<number>;
  readonly indices: ArrayLike<number>;
  /** Voxels take the group of the last source that covers them; each group meshes on its own. */
  readonly group: number;
}

export interface VoxelBuffers {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint32Array;
}

export interface Voxelized {
  readonly groups: ReadonlyMap<number, VoxelBuffers>;
  readonly stats: { readonly voxels: number; readonly faces: number; readonly quads: number };
}

const HALF_RANGE = 1024;
const RANGE = 2 * HALF_RANGE;
const NUDGE_X = 0.0137;
const NUDGE_Y = 0.0291;

/** Column `index`'s sample line, in voxels: its centre nudged toward the origin. */
const sampleAt = (index: number, nudge: number): number => (index >= 0 ? index + 0.5 - nudge : index + 0.5 + nudge);

/** The cells a voxelize call can touch, in voxels on its lattice, with a ring of cells around them that none fills. */
interface Box {
  readonly low: readonly [number, number, number];
  readonly size: readonly [number, number, number];
}

/**
 * The box around every vertex of the sources, shifted to the lattice. A cell a source fills or meets lies at most one
 * cell past its vertices, and a neighbour's cell matters only beside one of those, so the box holds two cells past the
 * vertices and a ring past that which no cell fills: a step from any cell to its neighbour stays in the box.
 */
const boxOf = (sources: readonly VoxelSource[], { grain, origin }: Lattice): Box => {
  const low = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const high = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const { positions } of sources) {
    for (let i = 0; i < positions.length; i += 1) {
      const cell = Math.floor((positions[i]! - origin[i % 3]!) / grain);
      low[i % 3] = Math.min(low[i % 3]!, cell);
      high[i % 3] = Math.max(high[i % 3]!, cell);
    }
  }
  if (!Number.isFinite(low[0])) {
    return { low: [0, 0, 0], size: [0, 0, 0] };
  }
  const [lx, ly, lz] = low.map((cell) => cell - 3) as [number, number, number];
  return { low: [lx, ly, lz], size: [high[0]! + 4 - lx, high[1]! + 4 - ly, high[2]! + 4 - lz] };
};

/** The key of a cell on the box's outer ring or past it. */
const OUTSIDE = -1;

/** A cell's key: its index in the box, or OUTSIDE. */
const keyIn = ({ low, size }: Box, x: number, y: number, z: number): number => {
  const at = [x - low[0], y - low[1], z - low[2]];
  return at.some((cell, axis) => cell < 1 || cell > size[axis]! - 2)
    ? OUTSIDE
    : (at[0]! * size[1] + at[1]!) * size[2] + at[2]!;
};

const EMPTY = -1;

/**
 * Voxels and their groups over a box, keyed by their index in it. Keys keep the order of the first set, as a map's
 * would, so every walk over the cells, and so the mesh, follows the order the sources filled them. A grid that `clips`
 * drops cells outside the box, for neighbours' cells, which matter only beside the sources'; any other grid refuses
 * them, since its sources' box holds them all.
 */
class Grid {
  readonly box: Box;
  /** Per cell of the box, its group or EMPTY. */
  readonly #cells: Int32Array;
  readonly #keys: number[] = [];
  readonly #clips: boolean;
  /** The key offsets to the six neighbours, ±z, ±y, ±x. */
  readonly steps: readonly number[];

  constructor(box: Box, { clips = false } = {}) {
    this.box = box;
    this.#clips = clips;
    const [dx, dy, dz] = box.size;
    this.#cells = new Int32Array(dx * dy * dz).fill(EMPTY);
    this.steps = [1, -1, dz, -dz, dy * dz, -dy * dz];
  }

  get size(): number {
    return this.#keys.length;
  }

  keys(): readonly number[] {
    return this.#keys;
  }

  voxelOf(key: number): [number, number, number] {
    const { low, size } = this.box;
    const z = key % size[2];
    const rest = (key - z) / size[2];
    const y = rest % size[1];
    return [(rest - y) / size[1] + low[0], y + low[1], z + low[2]];
  }

  has(key: number): boolean {
    return this.#cells[key]! !== EMPTY;
  }

  get(key: number): number | undefined {
    const group = this.#cells[key]!;
    return group === EMPTY ? undefined : group;
  }

  set(key: number, group: number): void {
    if (key === OUTSIDE) {
      if (this.#clips) {
        return;
      }
      throw new Error("A voxel falls outside its sources' box");
    }
    if (this.#cells[key] === EMPTY) {
      this.#keys.push(key);
    }
    this.#cells[key] = group;
  }

  clear(): void {
    for (const key of this.#keys) {
      this.#cells[key] = EMPTY;
    }
    this.#keys.length = 0;
  }
}

interface Lattice {
  readonly grain: number;
  readonly origin: readonly number[];
}

const checkedIndex = (value: number, grain: number): number => {
  const index = Math.floor(value / grain);
  if (Math.abs(index) >= HALF_RANGE) {
    throw new Error(`Voxel grain ${grain} m is too fine for a model this large`);
  }
  return index;
};

/** `ray` is the axis the rays run along; `across` are the two axes of the lattice of columns they start from. */
interface Axes {
  readonly across: readonly [number, number];
  readonly ray: number;
}

type Columns = Map<number, number[]>;

/** Adds the crossing of one triangle with each column of the sample lattice it covers. */
const addTriangle = (
  columns: Columns,
  at: (vertex: number, axis: number) => number,
  triangle: readonly [number, number, number],
  sampling: { readonly axes: Axes; readonly grain: number },
): void => {
  const [a, b, c] = triangle;
  const { grain, axes } = sampling;
  const [ax, ay] = axes.across;
  const area = (at(b, ax) - at(a, ax)) * (at(c, ay) - at(a, ay)) - (at(c, ax) - at(a, ax)) * (at(b, ay) - at(a, ay));
  if (Math.abs(area) < 1e-18) {
    return;
  }
  // One column past each end, as the nudge's direction depends on the column; the weights below reject the extras.
  const columnsOf = (axis: number): [number, number] => [
    Math.floor(Math.min(at(a, axis), at(b, axis), at(c, axis)) / grain - 0.5) - 1,
    Math.ceil(Math.max(at(a, axis), at(b, axis), at(c, axis)) / grain - 0.5) + 1,
  ];
  const [x0, x1] = columnsOf(ax);
  const [y0, y1] = columnsOf(ay);
  for (let ix = x0; ix <= x1; ix += 1) {
    for (let iy = y0; iy <= y1; iy += 1) {
      const px = sampleAt(ix, NUDGE_X) * grain;
      const py = sampleAt(iy, NUDGE_Y) * grain;
      const wa = ((at(b, ax) - px) * (at(c, ay) - py) - (at(c, ax) - px) * (at(b, ay) - py)) / area;
      const wb = ((at(c, ax) - px) * (at(a, ay) - py) - (at(a, ax) - px) * (at(c, ay) - py)) / area;
      const wc = 1 - wa - wb;
      if (wa < 0 || wb < 0 || wc < 0) {
        continue;
      }
      const key = (checkedIndex(px, grain) + HALF_RANGE) * RANGE + (checkedIndex(py, grain) + HALF_RANGE);
      const depth = wa * at(a, axes.ray) + wb * at(b, axes.ray) + wc * at(c, axes.ray);
      const depths = columns.get(key);
      if (depths) {
        depths.push(depth);
      } else {
        columns.set(key, [depth]);
      }
    }
  }
};

/** The ray-axis coordinate of every triangle crossing, per column of the sample lattice. */
const crossings = (source: VoxelSource, grain: number, axes: Axes): Columns => {
  const { positions, indices } = source;
  const columns: Columns = new Map();
  const at = (vertex: number, axis: number): number => positions[vertex * 3 + axis]!;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    addTriangle(columns, at, [indices[t]!, indices[t + 1]!, indices[t + 2]!], { axes, grain });
  }
  return columns;
};

type Span = readonly [from: number, to: number];

/** Per column of the sample lattice, the stretches of the ray inside a solid. */
type Spans = Map<number, Span[]>;

/** Pairs each column's crossings into spans; an open mesh's unpaired last crossing is dropped. */
const spansOf = (columns: Columns): Spans => {
  const spans: Spans = new Map();
  for (const [column, depths] of columns) {
    depths.sort((p, q) => p - q);
    const pairs: Span[] = [];
    for (let i = 0; i + 1 < depths.length; i += 2) {
      pairs.push([depths[i]!, depths[i + 1]!]);
    }
    spans.set(column, pairs);
  }
  return spans;
};

/**
 * Gaps narrower than this many voxels count as a seam between solids that share a face: pieces of one shape compute
 * the shared face separately and round it apart.
 */
const SEAM_VOXELS = 1e-3;

/** All the sources' spans, column by column, joined where they overlap or meet at a seam. */
const joinSpans = (all: readonly Spans[], grain: number): Spans => {
  const joined: Spans = new Map();
  for (const source of all) {
    for (const [column, spans] of source) {
      const into = joined.get(column);
      if (into) {
        into.push(...spans);
      } else {
        joined.set(column, [...spans]);
      }
    }
  }
  for (const [column, spans] of joined) {
    const merged: [number, number][] = [];
    for (const [from, to] of spans.sort((p, q) => p[0] - q[0])) {
      const last = merged.at(-1);
      if (last && from <= last[1] + SEAM_VOXELS * grain) {
        last[1] = Math.max(last[1], to);
      } else {
        merged.push([from, to]);
      }
    }
    joined.set(column, merged);
  }
  return joined;
};

/** The first and last voxel whose centre lies in the span, ends included; first > last when it holds none. */
const centresIn = ([from, to]: Span, grain: number): [number, number] => [
  Math.ceil(from / grain - 0.5),
  Math.floor(to / grain - 0.5),
];

/**
 * Fills the voxels whose centres lie inside the solid along one axis, and says whether it filled any. A span that holds
 * no centre still fills one voxel, so a thin solid keeps one voxel of thickness: the voxel at the span's middle, or,
 * when the span runs on into other sources' spans that hold centres, the one of those centres nearest it. A span cut
 * short by a seam, such as a curve facet clipped at its corner, is no thin solid, and its middle voxel would stick out
 * of the shape as a one-voxel sliver.
 */
const fillAlong = (
  target: { readonly grid: Grid; readonly group: number; readonly grain: number },
  axes: Axes,
  sampled: { readonly own: Spans; readonly joined: Spans },
): boolean => {
  const { grid, group, grain } = target;
  let filled = false;
  for (const [column, spans] of sampled.own) {
    const lattice = [Math.floor(column / RANGE) - HALF_RANGE, (column % RANGE) - HALF_RANGE];
    const set = (ray: number): void => {
      const voxel = [0, 0, 0];
      voxel[axes.across[0]] = lattice[0]!;
      voxel[axes.across[1]] = lattice[1]!;
      voxel[axes.ray] = checkedIndex((ray + 0.5) * grain, grain);
      grid.set(keyIn(grid.box, voxel[0]!, voxel[1]!, voxel[2]!), group);
      filled = true;
    };
    for (const span of spans) {
      const [first, last] = centresIn(span, grain);
      if (first > last) {
        const [from, to] = span;
        const middle = Math.floor((from + to) / 2 / grain);
        const whole = sampled.joined.get(column)?.find(([a, b]) => a <= from && to <= b) ?? span;
        const [low, high] = centresIn(whole, grain);
        set(low > high ? middle : Math.min(Math.max(middle, low), high));
      }
      for (let ray = first; ray <= last; ray += 1) {
        set(ray);
      }
    }
  }
  return filled;
};

const THIN_AXES: readonly Axes[] = [
  { across: [0, 1], ray: 2 },
  { across: [1, 2], ray: 0 },
  { across: [2, 0], ray: 1 },
];

/**
 * A solid is sampled along every axis, so any stretch of it thinner than the grain, such as a guard's bar or a tube's
 * wall, keeps a voxel's thickness wherever a sample line crosses it; a solid's size says nothing about how thin its
 * stretches are. One that no sample line crosses at all, a speck or an open sheet, takes the cells its surface meets,
 * so it stays where it touches its neighbours.
 */
const fillSource = (
  target: { readonly grid: Grid; readonly group: number; readonly grain: number },
  sampled: readonly { readonly own: Spans; readonly joined: Spans }[],
  surface: () => readonly number[],
): void => {
  const crossed = THIN_AXES.map((axes, index) => fillAlong(target, axes, sampled[index]!));
  if (!crossed.includes(true)) {
    for (const key of surface()) {
      target.grid.set(key, target.group);
    }
  }
};

type Vec = readonly [number, number, number];

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const UNITS: readonly Vec[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

interface SeparatingAxis {
  readonly axis: Vec;
  /** The triangle's extent along the axis. */
  readonly low: number;
  readonly high: number;
  /** A cell's half-extent along the axis. */
  readonly reach: number;
}

/** The axes that can separate a triangle from a closed cell of half-width `half`: the units, its normal, unit × edge. */
const separatingAxes = (triangle: readonly Vec[], half: number): SeparatingAxis[] => {
  const edges = [0, 1, 2].map((i) => {
    const [p, q] = [triangle[i]!, triangle[(i + 1) % 3]!];
    return [q[0] - p[0], q[1] - p[1], q[2] - p[2]] as const;
  });
  const axes = [
    ...UNITS,
    cross(edges[0]!, edges[1]!),
    ...UNITS.flatMap((unit) => edges.map((edge) => cross(unit, edge))),
  ];
  return axes.map((axis) => {
    const projected = triangle.map((p) => p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2]);
    return {
      axis,
      low: Math.min(...projected),
      high: Math.max(...projected),
      reach: half * (Math.abs(axis[0]) + Math.abs(axis[1]) + Math.abs(axis[2])) * (1 + 1e-9),
    };
  });
};

/** Whether the triangle whose separating axes these are meets the cell centred at `centre`. */
const meetsCell = (axes: readonly SeparatingAxis[], centre: Vec): boolean => {
  for (const { axis, low, high, reach } of axes) {
    const at = centre[0] * axis[0] + centre[1] * axis[1] + centre[2] * axis[2];
    if (low - at > reach || high - at < -reach) {
      return false;
    }
  }
  return true;
};

/** Every cell the source's surface meets, keyed in `box`, in the order its triangles meet them; a cell may repeat. */
const surfaceCells = (source: VoxelSource, grain: number, box: Box): number[] => {
  const reach: number[] = [];
  const { positions, indices } = source;
  const point = (vertex: number): Vec => [
    positions[vertex * 3]!,
    positions[vertex * 3 + 1]!,
    positions[vertex * 3 + 2]!,
  ];
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const triangle = [point(indices[t]!), point(indices[t + 1]!), point(indices[t + 2]!)];
    const axes = separatingAxes(triangle, grain / 2);
    const [low, high] = [Math.min, Math.max].map((pick) =>
      [0, 1, 2].map((axis) => checkedIndex(pick(...triangle.map((p) => p[axis]!)) / grain, 1)),
    );
    for (let x = low![0]! - 1; x <= high![0]! + 1; x += 1) {
      for (let y = low![1]! - 1; y <= high![1]! + 1; y += 1) {
        for (let z = low![2]! - 1; z <= high![2]! + 1; z += 1) {
          if (meetsCell(axes, [(x + 0.5) * grain, (y + 0.5) * grain, (z + 0.5) * grain])) {
            reach.push(keyIn(box, x, y, z));
          }
        }
      }
    }
  }
  return reach;
};

/** The 6-connected bodies of the grid, largest first, as keys in the order the walk reaches them. */
const bodiesOf = (grid: Grid): number[][] => {
  const seen = new Uint8Array(grid.box.size[0] * grid.box.size[1] * grid.box.size[2]);
  const bodies: number[][] = [];
  for (const start of grid.keys()) {
    if (seen[start]) {
      continue;
    }
    const body = [start];
    seen[start] = 1;
    const stack = [start];
    while (stack.length > 0) {
      const key = stack.pop()!;
      for (const step of grid.steps) {
        const next = key + step;
        if (grid.has(next) && !seen[next]) {
          seen[next] = 1;
          body.push(next);
          stack.push(next);
        }
      }
    }
    bodies.push(body);
  }
  return bodies.sort((a, b) => b.length - a.length);
};

const UNREACHED = -1;

/**
 * Cells by their distance from the joined cells, popped nearest first. A cell may be pushed again when a shorter walk
 * reaches it; the entry at its old distance is then stale and skipped.
 */
const walkQueue = (cells: number) => {
  /** Per cell, its distance, or UNREACHED. */
  const distance = new Int32Array(cells).fill(UNREACHED);
  const buckets: number[][] = [];
  let lowest = 0;
  return {
    distance,
    push: (cell: number, steps: number): void => {
      distance[cell] = steps;
      const bucket = buckets[steps] ?? [];
      buckets[steps] = bucket;
      bucket.push(cell);
      lowest = Math.min(lowest, steps);
    },
    pop: (): number | undefined => {
      while (lowest < buckets.length) {
        const cell = buckets[lowest]?.pop();
        if (cell === undefined) {
          lowest += 1;
        } else if (distance[cell] === lowest) {
          return cell;
        }
      }
      return undefined;
    },
  };
};

/**
 * Joins the grid's bodies that the sources connect, to each other and to the neighbours' voxels in `anchor`: the
 * joined cells walk out through cells the sources meet, and the shortest walk that reaches another body is filled,
 * which joins that body. When no walk reaches one, the largest body left joins. Sources that do not meet stay apart.
 *
 * One search serves every join: a cell that joins enters at distance zero and the search carries on from the shortest
 * walks left, so a part that samples into many bodies, like a thin turned wall whose slanted flats fall apart into
 * single voxels, costs about one pass over the cells instead of one pass per body.
 */
const bridge = (grid: Grid, reach: Grid, anchor: Grid): void => {
  const bodies = bodiesOf(grid);
  const cells = grid.box.size[0] * grid.box.size[1] * grid.box.size[2];
  const bodyOf = new Int32Array(cells);
  bodies.forEach((body, index) => {
    for (const key of body) {
      bodyOf[key] = index;
    }
  });
  const queue = walkQueue(cells);
  const { distance } = queue;
  /** Per cell a walk reached, the cell it came from. */
  const from = new Int32Array(cells);
  /** Walks one step out from `cell` through cells the sources meet; the first cell of a body beside it, if any. */
  const stepOut = (cell: number): number | undefined => {
    const steps = distance[cell]! + 1;
    let end: number | undefined;
    for (const step of grid.steps) {
      const next = cell + step;
      if (distance[next] === 0) {
        continue;
      }
      if (grid.has(next)) {
        end ??= next;
      } else if (reach.has(next) && (distance[next] === UNREACHED || distance[next]! > steps)) {
        from[next] = cell;
        queue.push(next, steps);
      }
    }
    return end;
  };
  /**
   * Fills the walk back from `cell` to the joined cells. The walk's cells join, and `cell` itself walks out again for
   * any other body beside it.
   */
  const fillWalk = (cell: number): void => {
    const walk = [cell];
    while (distance[walk.at(-1)!] !== 0) {
      walk.push(from[walk.at(-1)!]!);
    }
    for (const filled of walk.slice(0, -1)) {
      grid.set(filled, reach.get(filled)!);
    }
    for (const joined of walk) {
      queue.push(joined, 0);
    }
  };
  const merged = new Set<number>();
  const join = (index: number): void => {
    merged.add(index);
    for (const key of bodies[index]!) {
      queue.push(key, 0);
    }
  };
  for (const key of anchor.keys()) {
    queue.push(key, 0);
  }
  while (merged.size < bodies.length) {
    const cell = queue.pop();
    if (cell === undefined) {
      join(bodies.findIndex((_, index) => !merged.has(index)));
      continue;
    }
    const end = stepOut(cell);
    if (end !== undefined) {
      fillWalk(cell);
      join(bodyOf[end]!);
    }
  }
};

interface Sweep {
  readonly d: number;
  readonly u: number;
  readonly v: number;
  readonly sign: 1 | -1;
}

interface Face {
  readonly u: number;
  readonly v: number;
  readonly group: number;
}

interface Builder {
  readonly positions: number[];
  readonly normals: number[];
  readonly indices: number[];
}

type Bounds = readonly [min: readonly number[], max: readonly number[]];

const emitQuad = (
  out: Builder,
  sweep: Sweep,
  quad: { readonly plane: number; readonly rect: readonly [number, number, number, number] },
  grain: number,
): void => {
  const [u0, v0, width, height] = quad.rect;
  const corners: [number, number][] = [
    [u0, v0],
    [u0 + width, v0],
    [u0 + width, v0 + height],
    [u0, v0 + height],
  ];
  if (sweep.sign < 0) {
    corners.reverse();
  }
  const base = out.positions.length / 3;
  for (const [cu, cv] of corners) {
    const position = [0, 0, 0];
    position[sweep.d] = quad.plane * grain;
    position[sweep.u] = cu * grain;
    position[sweep.v] = cv * grain;
    out.positions.push(...position);
    const normal = [0, 0, 0];
    normal[sweep.d] = sweep.sign;
    out.normals.push(...normal);
  }
  out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
};

/** The widest run from `start`, then as many rows below as match it, as [width, height]. */
const rectFrom = (
  mask: Int32Array,
  [du, dv]: readonly [number, number],
  at: readonly [number, number],
): [number, number] => {
  const [i, j] = at;
  const start = i + j * du;
  const group = mask[start]!;
  let width = 1;
  while (i + width < du && mask[start + width] === group) {
    width += 1;
  }
  const rowMatches = (row: number): boolean => {
    for (let k = 0; k < width; k += 1) {
      if (mask[start + row * du + k] !== group) {
        return false;
      }
    }
    return true;
  };
  let height = 1;
  while (j + height < dv && rowMatches(height)) {
    height += 1;
  }
  return [width, height];
};

/** Merges equal neighbours of one slice into rectangles. */
const greedy = (mask: Int32Array, size: readonly [number, number], emit: (rect: number[], group: number) => void) => {
  const [du, dv] = size;
  for (let j = 0; j < dv; j += 1) {
    for (let i = 0; i < du; ) {
      const group = mask[i + j * du]!;
      if (group < 0) {
        i += 1;
        continue;
      }
      const [width, height] = rectFrom(mask, size, [i, j]);
      for (let row = 0; row < height; row += 1) {
        mask.fill(-1, i + (j + row) * du, i + (j + row) * du + width);
      }
      emit([i, j, width, height], group);
      i += width;
    }
  }
};

type ExposeInterface = (group: number, neighbour: number) => boolean;

const exposedFaces = (
  grid: Grid,
  sweep: Sweep,
  exposeInterface?: ExposeInterface,
): { readonly slices: Map<number, Face[]>; readonly count: number } => {
  const { d, sign } = sweep;
  const slices = new Map<number, Face[]>();
  let count = 0;
  // The neighbour along +d is the step for axis d in Grid.steps, which runs z, y, x.
  const step = sign * grid.steps[2 * (2 - d)]!;
  for (const key of grid.keys()) {
    const group = grid.get(key)!;
    const at = grid.voxelOf(key);
    const neighbour = grid.get(key + step);
    if (neighbour !== undefined && !exposeInterface?.(group, neighbour)) {
      continue;
    }
    const slice = slices.get(at[d]!) ?? [];
    slice.push({ u: at[sweep.u]!, v: at[sweep.v]!, group });
    slices.set(at[d]!, slice);
    count += 1;
  }
  return { slices, count };
};

// A loop rather than a spread into Math.min: a fine-grained grid has more voxels than a call can take arguments.
const boundsOf = (grid: Grid): Bounds => {
  const low = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const high = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const key of grid.keys()) {
    const at = grid.voxelOf(key);
    for (let axis = 0; axis < 3; axis += 1) {
      low[axis] = Math.min(low[axis]!, at[axis]!);
      high[axis] = Math.max(high[axis]!, at[axis]!);
    }
  }
  return [low, high];
};

/** A face in source-local metres that must keep its voxel-grain tessellation. */
export type PreserveVoxelFace = (min: readonly number[], max: readonly number[]) => boolean;

const sliceMask = (
  slice: readonly Face[],
  { bounds, sweep, plane, grain }: { bounds: Bounds; sweep: Sweep; plane: number; grain: number },
  preserveFace: PreserveVoxelFace | undefined,
  emit: (face: Face) => void,
): Int32Array => {
  const du = bounds[1][sweep.u]! - bounds[0][sweep.u]! + 1;
  const dv = bounds[1][sweep.v]! - bounds[0][sweep.v]! + 1;
  const mask = new Int32Array(du * dv).fill(-1);
  for (const face of slice) {
    const min = [0, 0, 0];
    min[sweep.d] = plane * grain;
    min[sweep.u] = face.u * grain;
    min[sweep.v] = face.v * grain;
    const max = [...min];
    max[sweep.u] = (face.u + 1) * grain;
    max[sweep.v] = (face.v + 1) * grain;
    if (preserveFace?.(min, max)) {
      emit(face);
    } else {
      mask[face.u - bounds[0][sweep.u]! + (face.v - bounds[0][sweep.v]!) * du] = face.group;
    }
  }
  return mask;
};

const meshGrid = (
  grid: Grid,
  grain: number,
  preserveFace?: PreserveVoxelFace,
  exposeInterface?: ExposeInterface,
): Voxelized => {
  const builders = new Map<number, Builder>();
  const builderOf = (group: number): Builder => {
    let builder = builders.get(group);
    if (!builder) {
      builder = { positions: [], normals: [], indices: [] };
      builders.set(group, builder);
    }
    return builder;
  };
  const bounds = boundsOf(grid);
  let faces = 0;
  let quads = 0;
  for (let d = 0; d < 3; d += 1) {
    for (const sign of [1, -1] as const) {
      const sweep: Sweep = { d, u: (d + 1) % 3, v: (d + 2) % 3, sign };
      const exposed = exposedFaces(grid, sweep, exposeInterface);
      const { slices } = exposed;
      faces += exposed.count;
      const du = bounds[1][sweep.u]! - bounds[0][sweep.u]! + 1;
      const dv = bounds[1][sweep.v]! - bounds[0][sweep.v]! + 1;
      for (const [w, slice] of [...slices].sort(([p], [q]) => p - q)) {
        const plane = w + (sign > 0 ? 1 : 0);
        const mask = sliceMask(slice, { bounds, sweep, plane, grain }, preserveFace, (face) => {
          quads += 1;
          emitQuad(builderOf(face.group), sweep, { plane, rect: [face.u, face.v, 1, 1] }, grain);
        });
        greedy(mask, [du, dv], ([i, j, width, height], group) => {
          quads += 1;
          emitQuad(
            builderOf(group),
            sweep,
            {
              plane: w + (sign > 0 ? 1 : 0),
              rect: [bounds[0][sweep.u]! + i!, bounds[0][sweep.v]! + j!, width!, height!],
            },
            grain,
          );
        });
      }
    }
  }
  const groups = new Map<number, VoxelBuffers>(
    [...builders].map(([group, builder]) => [
      group,
      {
        positions: new Float32Array(builder.positions),
        normals: new Float32Array(builder.normals),
        indices: new Uint32Array(builder.indices),
      },
    ]),
  );
  return { groups, stats: { voxels: grid.size, faces, quads } };
};

const shifted = (values: ArrayLike<number>, by: readonly number[], sign: 1 | -1): Float32Array =>
  Float32Array.from({ length: values.length }, (_, i) => values[i]! + sign * by[i % 3]!);

const checkedGrain = (grain: number): void => {
  if (!(Number.isFinite(grain) && grain > 0)) {
    throw new Error(`Voxel grain must be a positive number of metres, got ${grain}`);
  }
};

/**
 * Samples the sources together, so thinness is judged on the shape they make: `fill(index, grid)` fills source `index`'s
 * voxels into `grid`, and `surface(index)` lists the cells its surface meets.
 */
const sample = (solids: readonly VoxelSource[], { grain, origin }: Lattice, box: Box) => {
  const locals = solids.map((source) => ({ ...source, positions: shifted(source.positions, origin, -1) }));
  const spans = locals.map((local) => THIN_AXES.map((axes) => spansOf(crossings(local, grain, axes))));
  const joined = THIN_AXES.map((_, axis) =>
    joinSpans(
      spans.map((own) => own[axis]!),
      grain,
    ),
  );
  const surfaces: (readonly number[] | undefined)[] = [];
  const surface = (index: number): readonly number[] => {
    surfaces[index] ??= surfaceCells(locals[index]!, grain, box);
    return surfaces[index];
  };
  return {
    fill: (index: number, grid: Grid): void =>
      fillSource(
        { grid, group: locals[index]!.group, grain },
        spans[index]!.map((own, axis) => ({ own, joined: joined[axis]! })),
        () => surface(index),
      ),
    surface,
  };
};

export interface VoxelMeasure {
  /** Corners of the voxels' bounds, in the sources' metres. */
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
  /** Mean of the voxel centres. */
  readonly centroid: readonly [number, number, number];
  readonly voxels: number;
}

/**
 * Measures, source by source, the voxels `voxelize` fills when it samples these sources together on the same lattice,
 * before bridging joins them to anything, so a datum read off one solid follows the voxels that solid draws beside its
 * siblings. A source that fills no voxels measures undefined.
 */
export const measureVoxels = (
  sources: readonly VoxelSource[],
  grain: number,
  origin: readonly number[] = [0, 0, 0],
): (VoxelMeasure | undefined)[] => {
  checkedGrain(grain);
  const lattice = { grain, origin };
  const box = boxOf(sources, lattice);
  const sampled = sample(sources, lattice, box);
  const grid = new Grid(box);
  const at = (axis: number, cells: number): number => cells * grain + origin[axis]!;
  const measureOf = (grid: Grid): VoxelMeasure => {
    const [low, high] = boundsOf(grid);
    const sum = [0, 0, 0];
    for (const key of grid.keys()) {
      grid.voxelOf(key).forEach((index, axis) => {
        sum[axis] = sum[axis]! + index;
      });
    }
    return {
      min: [at(0, low[0]!), at(1, low[1]!), at(2, low[2]!)],
      max: [at(0, high[0]! + 1), at(1, high[1]! + 1), at(2, high[2]! + 1)],
      centroid: [at(0, sum[0]! / grid.size + 0.5), at(1, sum[1]! / grid.size + 0.5), at(2, sum[2]! / grid.size + 0.5)],
      voxels: grid.size,
    };
  };
  return sources.map((_, index) => {
    grid.clear();
    sampled.fill(index, grid);
    return grid.size === 0 ? undefined : measureOf(grid);
  });
};

/**
 * Voxelizes the sources at `grain` metres, on a lattice anchored at `origin` (part-local metres, the part origin by
 * default) so a caller can put the voxels of parts placed at fractions of a voxel on one shared lattice. `neighbours`
 * are the solids of other parts that may touch these (part-local metres): they are not drawn, but a piece of these
 * sources that meets one is joined to its voxels, so a part that holds on through its neighbour stays on. Empty input
 * gives no groups.
 */
export const voxelize = (
  sources: readonly VoxelSource[],
  grain: number,
  origin: readonly number[] = [0, 0, 0],
  {
    neighbours = [],
    preserveFace,
    exposeInterface,
  }: {
    readonly neighbours?: readonly VoxelSource[];
    readonly preserveFace?: PreserveVoxelFace | undefined;
    readonly exposeInterface?: ExposeInterface;
  } = {},
): Voxelized => {
  checkedGrain(grain);
  const lattice = { grain, origin };
  const box = boxOf(sources, lattice);
  const grid = new Grid(box);
  const reach = new Grid(box);
  const drawn = sample(sources, lattice, box);
  for (const [index, { group }] of sources.entries()) {
    drawn.fill(index, grid);
    for (const key of drawn.surface(index)) {
      reach.set(key, group);
    }
  }
  const anchor = new Grid(box, { clips: true });
  const neighbouring = sample(neighbours, lattice, box);
  for (const index of neighbours.keys()) {
    neighbouring.fill(index, anchor);
  }
  bridge(grid, reach, anchor);
  if (grid.size === 0) {
    return { groups: new Map(), stats: { voxels: 0, faces: 0, quads: 0 } };
  }
  const localFace = preserveFace
    ? (min: readonly number[], max: readonly number[]) =>
        preserveFace(
          min.map((value, axis) => value + origin[axis]!),
          max.map((value, axis) => value + origin[axis]!),
        )
    : undefined;
  const { groups, stats } = meshGrid(grid, grain, localFace, exposeInterface);
  return {
    groups: new Map([...groups].map(([group, b]) => [group, { ...b, positions: shifted(b.positions, origin, 1) }])),
    stats,
  };
};
