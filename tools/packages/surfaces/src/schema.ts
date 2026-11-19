import {
  check,
  finite,
  type InferOutput,
  literal,
  maxValue,
  metadata,
  minValue,
  number,
  picklist,
  pipe,
  strictObject,
  tuple,
  variant,
} from 'valibot';

/** The closed set of surface kinds, so a game can compile every program variant before first draw. */
export const SURFACE_KINDS = ['bark', 'leaf'] as const;
export type SurfaceKind = (typeof SURFACE_KINDS)[number];

/**
 * A look's tuning number. Its range is both what a look may hold and what a lab's slider spans, so the slider can
 * never write a look the schema refuses.
 */
const tunable = (lo: number, hi: number) =>
  pipe(number(), finite(), minValue(lo), maxValue(hi), metadata({ range: [lo, hi] as const }));

const Point = tuple([pipe(number(), finite()), pipe(number(), finite()), pipe(number(), finite())]);
const Distance = pipe(number(), finite(), minValue(0));

/** Where detail finer than a pixel fades, in features per pixel: it starts at `from` and is gone by `to`. */
const FadeSchema = pipe(
  strictObject({ from: tunable(0.05, 4), to: tunable(0.05, 4) }),
  check(({ from, to }) => from < to, 'a fade starts before it ends'),
);

/**
 * Sparse dark marks laid on a lattice across and along the grain, at most one per cell, such as a birch's lenticels
 * or its dark patches.
 */
const MarksSchema = strictObject({
  /** One lattice cell's size across the grain, in metres. */
  cellAcross: tunable(0.005, 1),
  /** One lattice cell's size along the grain, in metres. */
  cellAlong: tunable(0.005, 1),
  /** A mark's length across the grain, as a share of its cell. */
  across: tunable(0, 1),
  /** A mark's length along the grain, as a share of its cell. */
  along: tunable(0, 1),
  /** The share of cells that hold a mark. */
  density: tunable(0, 1),
  /** How much darker a mark's core is, as a share of the colour. */
  depth: tunable(0, 0.9),
});

/** How a bark's grain runs: along the model's up, as a standing trunk grows, or along the model's longest side. */
export const BARK_GRAINS = ['up', 'main'] as const;

/**
 * Bark drawn in the model's own axes, since the export carries no texture coordinates: furrows along the grain,
 * plates between them, a slow mottle and sparse marks. Every lightness term averages to nothing over a wide face, so
 * bark never recolours its finish.
 */
export const BarkSchema = strictObject({
  kind: literal('bark'),
  grain: picklist(BARK_GRAINS),
  furrow: strictObject({
    /** From one furrow to the next, across the grain, in metres. */
    spacing: tunable(0.01, 0.5),
    /** A furrow's half-width, as a share of the spacing. */
    width: tunable(0.02, 0.5),
    /** How much darker a furrow's floor is, as a share of the colour. */
    depth: tunable(0, 0.9),
    /** How far a furrow strays sideways, in spacings. */
    wander: tunable(0, 1),
    /** The length over which a furrow's wander turns, in metres. */
    wanderLength: tunable(0.02, 4),
  }),
  plate: strictObject({
    /** A plate's length along the grain, from one cross crack to the next, in metres. */
    length: tunable(0.02, 2),
    /** A cross crack's half-width, as a share of the plate's length. */
    crack: tunable(0.02, 0.5),
    /** How much darker a crack's floor is, as a share of the colour. */
    crackDepth: tunable(0, 0.9),
    /** How far each plate's lightness strays from the colour, as a share of it. */
    spread: tunable(0, 0.5),
    /** How far each plate leans to one side, as a slope. */
    tilt: tunable(0, 1),
  }),
  /** The slope of the furrows' and cracks' walls, which is how strongly they catch the light. */
  relief: tunable(0, 2),
  mottle: strictObject({
    /** The size of the slow lightness drift through the wood, in metres. */
    span: tunable(0.05, 8),
    /** How far the drift strays from the colour, as a share of it. */
    amount: tunable(0, 0.5),
  }),
  lenticels: MarksSchema,
  patches: MarksSchema,
  fade: FadeSchema,
});

/** The leaf shapes a cell's shading draws: a broad leaf with a dark margin, or a cluster of needles. */
export const LEAF_SHAPES = ['broad', 'needle'] as const;

/**
 * Foliage cut into leaf-sized cells in world space, each with a fixed rank, a cell kept while its rank is below the
 * coverage in force. Fixed ranks keep the holes still in the world, and a lower coverage only adds holes.
 */
export const LeafSchema = strictObject({
  kind: literal('leaf'),
  shape: picklist(LEAF_SHAPES),
  /** The share of cells kept everywhere, shadows included; 1 is solid foliage. */
  coverage: tunable(0, 1),
  /** A leaf cell's size, in metres. */
  cell: tunable(0.01, 1),
  /** How far a cell's centre strays from its lattice point, as a share of the cell; 0 is a regular grid. */
  jitter: tunable(0, 1),
  /** How far each leaf's lightness strays from the colour, as a share of it. */
  spread: tunable(0, 0.5),
  /** How far each leaf leans its normal away from the surface's. */
  tilt: tunable(0, 1),
  edge: strictObject({
    /** A leaf's margin, or the gap between needles, as a share of the cell. */
    width: tunable(0, 1),
    /** How much darker the margin or gap is, as a share of the colour. */
    depth: tunable(0, 0.9),
  }),
  /** How many needles a needle cell shows across. */
  needles: tunable(1, 16),
  fade: FadeSchema,
});

export const SurfaceSchema = variant('kind', [BarkSchema, LeafSchema]);

/**
 * What a game feeds the leaf kind each frame. The game owns the values, because how far a player sees out of foliage
 * is a game rule, not a property of leaves; the package owns their shape. Within `seeRadius` of the segment from the
 * eye to the local player the coverage falls to `nearCoverage`, back to the look's own over `seeEdge` beyond it.
 */
export const LeafInputsSchema = strictObject({
  eye: Point,
  player: Point,
  nearCoverage: tunable(0, 1),
  seeRadius: Distance,
  seeEdge: Distance,
});

export type BarkSurface = InferOutput<typeof BarkSchema>;
export type LeafSurface = InferOutput<typeof LeafSchema>;
export type Surface = InferOutput<typeof SurfaceSchema>;
export type LeafInputs = InferOutput<typeof LeafInputsSchema>;

/** A number a shader reads as a uniform, by its path in a look or the inputs, with its slider's range if it has one. */
export interface UniformField {
  readonly path: readonly string[];
  readonly type: 'float' | 'vec3';
  readonly range?: readonly [number, number];
}

interface Introspected {
  readonly type: string;
  readonly entries?: Readonly<Record<string, Introspected>>;
  readonly items?: readonly Introspected[];
  readonly pipe?: readonly {
    readonly type: string;
    readonly metadata?: { readonly range?: readonly [number, number] };
  }[];
}

const rangeOf = (schema: Introspected) => schema.pipe?.find((action) => action.type === 'metadata')?.metadata?.range;

/**
 * Every number in an object schema, walked into its nested objects, so a kind's uniforms and a lab's sliders come
 * from the schema rather than from a hand list. Fields that are not numbers, such as a kind or a picklist, are left
 * to the kind.
 */
export const uniformFields = (schema: Introspected, path: readonly string[] = []): UniformField[] =>
  Object.entries(schema.entries ?? {}).flatMap(([name, entry]): UniformField[] => {
    const at = [...path, name];
    if (entry.entries !== undefined) return uniformFields(entry, at);
    if (entry.type === 'tuple' && entry.items?.length === 3 && entry.items.every((item) => item.type === 'number'))
      return [{ path: at, type: 'vec3' }];
    if (entry.type !== 'number') return [];
    const range = rangeOf(entry);
    return [range === undefined ? { path: at, type: 'float' } : { path: at, type: 'float', range }];
  });
