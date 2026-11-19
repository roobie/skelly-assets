import type { Surface, SurfaceSchema } from '@skelly/surfaces/schema';
import {
  array,
  type InferOutput,
  literal,
  minValue,
  number,
  object,
  optional,
  parse,
  pipe,
  record,
  strictObject,
  string,
  tuple,
  union,
} from 'valibot';

// The shape of models/shader-lab.jsonnet and of the finish table as the lab reads them. The surfaces themselves are
// checked against the surfaces package's own schema, passed in, so an edit to that package reaches the page as a hot
// update rather than through this module.

const Vec3 = tuple([number(), number(), number()]);
const Range = tuple([number(), number()]);
const Positive = pipe(number(), minValue(0));

const LightSchema = strictObject({ colour: Vec3, intensity: Positive, from: Vec3 });

const StageSchema = union([
  strictObject({ title: string(), showcase: literal(true), background: Vec3 }),
  strictObject({
    title: string(),
    background: Vec3,
    environment: Positive,
    sun: LightSchema,
    hemisphere: strictObject({ sky: Vec3, ground: Vec3, intensity: Positive }),
    torch: optional(
      strictObject({ colour: Vec3, intensity: Positive, distance: Positive, decay: Positive, offset: Vec3 }),
    ),
  }),
]);

const ShapeSchema = union([
  strictObject({ quad: tuple([Positive, Positive]) }),
  strictObject({ cylinder: strictObject({ radius: Positive, height: Positive }) }),
]);

const PieceSchema = union([
  strictObject({ id: string(), title: string(), shape: ShapeSchema, at: Vec3, finish: string() }),
  strictObject({
    id: string(),
    title: string(),
    shape: ShapeSchema,
    at: Vec3,
    colour: Vec3,
    roughness: Positive,
    look: string(),
  }),
]);

type Surfaces = typeof SurfaceSchema;

const LabSchema = (surface: Surfaces) =>
  strictObject({
    looks: record(string(), surface),
    stages: record(string(), StageSchema),
    model: string(),
    shadow: strictObject({ mapSize: Positive, extent: Positive, bias: number(), normalBias: number() }),
    ground: strictObject({ size: Positive, colour: Vec3, roughness: Positive }),
    gap: Positive,
    pieces: array(PieceSchema),
    seeThrough: strictObject({
      nearCoverage: number(),
      seeRadius: Positive,
      seeEdge: Positive,
      ranges: record(string(), Range),
    }),
    camera: strictObject({
      fov: Positive,
      near: Positive,
      far: Positive,
      eyeHeight: Positive,
      walkSpeed: Positive,
      turn: Positive,
      follow: strictObject({ distance: Positive, height: number() }),
      player: strictObject({ radius: Positive, height: Positive, colour: Vec3 }),
    }),
  });

/** A finish as the lab draws it: its colour and, when it wears one, its surface. Other fields are the showcase's. */
const FinishSchema = (surface: Surfaces) =>
  object({
    colour: Vec3,
    finish: object({ metallic: number(), roughness: number(), surface: optional(surface) }),
  });

export type Lab = InferOutput<ReturnType<typeof LabSchema>>;
export type Stage = Lab['stages'][string];
export type Piece = Lab['pieces'][number];
type Finishes = Readonly<Record<string, InferOutput<ReturnType<typeof FinishSchema>>>>;

export interface Content {
  readonly finishes: Finishes;
  readonly lab: Lab;
}

/** The content from its compiled JSON, each surface held to `surface`, the surfaces package's SurfaceSchema. */
export const parseContent = (
  json: { readonly finishes: unknown; readonly lab: unknown },
  surface: Surfaces,
): Content => ({
  finishes: parse(record(string(), FinishSchema(surface)), json.finishes),
  lab: parse(LabSchema(surface), json.lab),
});

/** Whether `stage` is the showcase's own. */
export const isShowcase = (stage: Stage): stage is Extract<Stage, { showcase: true }> => 'showcase' in stage;

/** The surface a piece wears, from the finish table or the lab's looks. */
export const pieceSurface = (piece: Piece, { finishes, lab }: Content): Surface | undefined =>
  'finish' in piece ? finishes[piece.finish]?.finish.surface : lab.looks[piece.look];

/** Every piece's finish or look that content lacks, so a misspelt name fails rather than drawing plain. */
export const missingNames = ({ finishes, lab }: Content): string[] =>
  lab.pieces.flatMap((piece) =>
    'finish' in piece
      ? finishes[piece.finish] === undefined
        ? [`${piece.id}: no finish ${piece.finish}`]
        : []
      : lab.looks[piece.look] === undefined
        ? [`${piece.id}: no look ${piece.look}`]
        : [],
  );
