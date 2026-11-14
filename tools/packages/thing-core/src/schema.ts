import {
  array,
  type BaseSchema,
  type BaseIssue,
  check,
  literal,
  finite,
  type InferOutput,
  maxValue,
  minValue,
  nonEmpty,
  number,
  type ObjectEntries,
  optional,
  picklist,
  pipe,
  record,
  regex,
  strictObject,
  string,
  tuple,
  variant,
} from 'valibot';

export const ModelPointSchema = tuple([pipe(number(), finite()), pipe(number(), finite()), pipe(number(), finite())]);
const dotOf = (a: readonly number[], b: readonly number[]) => a.reduce((sum, value, axis) => sum + value * b[axis]!, 0);
const UnitVectorSchema = pipe(
  ModelPointSchema,
  check((point) => Math.abs(Math.hypot(...point) - 1) <= 1e-6, 'must be a unit vector'),
);
const ID_PATTERN = /^[a-z0-9_]+$/;
const CALIBRE_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
export const Id = pipe(string(), regex(ID_PATTERN, 'must be lowercase letters, digits and _'));
export const Name = pipe(string(), nonEmpty('must not be empty'));
export const CalibreId = pipe(string(), regex(CALIBRE_ID_PATTERN, 'must be a cartridge-data id'));

export { firearmModelSchema, type FirearmPrimitives } from './firearmModelSchema.ts';

/** Consumer primitives preserve their output types, including runtime brands. */
export interface VehiclePrimitives {
  readonly id: BaseSchema<string, string, BaseIssue<unknown>>;
  readonly name: BaseSchema<string, string, BaseIssue<unknown>>;
  readonly positiveSimSeconds: BaseSchema<unknown, number, BaseIssue<unknown>>;
  readonly qualityLevel: BaseSchema<unknown, number, BaseIssue<unknown>>;
  readonly cells: BaseSchema<unknown, number, BaseIssue<unknown>>;
}

export const vehicleServiceFields = <const P extends VehiclePrimitives>(primitives: P) => {
  const id: P['id'] = primitives.id;
  const duration: P['positiveSimSeconds'] = primitives.positiveSimSeconds;
  const quality: P['qualityLevel'] = primitives.qualityLevel;
  return { mount: id, durationSimSeconds: duration, qualities: record(id, quality) };
};

export const vehicleBlueprintSchema = <const P extends VehiclePrimitives>(primitives: P) => {
  const id: P['id'] = primitives.id;
  const name: P['name'] = primitives.name;
  const cells: P['cells'] = primitives.cells;
  const fitting = strictObject({
    id,
    part: id,
    at: ModelPointSchema,
    mirror: optional(literal(true)),
    supportedBy: array(id),
    cargo: optional(tuple([cells, cells, cells])),
    service: optional(strictObject({ name, ...vehicleServiceFields(primitives) })),
  });
  return strictObject({
    id,
    name,
    fittings: pipe(
      array(fitting),
      nonEmpty('needs at least one fitting'),
      check((list) => new Set(list.map(({ id }) => id)).size === list.length, 'fitting ids must be distinct'),
    ),
  });
};

export const ModelBoxSchema = pipe(
  strictObject({ min: ModelPointSchema, max: ModelPointSchema }),
  check(({ min, max }) => min.every((value, axis) => value <= max[axis]!), 'box min must not exceed max'),
);

export const ModelPartSchema = strictObject({
  /** The item this part is; the consumer checks it is registered and weighs what the part does. */
  item: optional(Id),
  massKg: pipe(number(), finite(), minValue(0)),
  centreOfMass: ModelPointSchema,
  node: optional(pipe(string(), nonEmpty())),
  collision: optional(pipe(array(ModelBoxSchema), nonEmpty('baked collision needs a box'))),
  /** Metres between the planes, from the model origin, that its baked collision lies on when drawn in voxels. */
  voxelGrain: optional(
    pipe(
      number(),
      finite(),
      check((grain) => grain > 0, 'voxel grain must be positive'),
    ),
  ),
});

/**
 * A flat rectangle on a model's surface: its centre, the way it faces, the way its top points, and its width across
 * and height along that top in metres.
 */
const surfaceEntries = {
  at: ModelPointSchema,
  normal: UnitVectorSchema,
  up: UnitVectorSchema,
  size: tuple([pipe(number(), finite(), minValue(0)), pipe(number(), finite(), minValue(0))]),
};

const positive = pipe(
  number(),
  finite(),
  check((value) => value > 0, 'must be positive'),
);

/** The authored stop of a hinge in degrees: a part opening further than a half turn would pass through its carrier. */
export const OpenAngleSchema = pipe(positive, maxValue(180));

/** A stage's part of its motion's clock, from 0 to 1, which it runs through linearly. */
const ShareSchema = pipe(
  number(),
  finite(),
  check((share) => share > 0 && share <= 1, 'stage share must be above 0 and at most 1'),
);

/**
 * A part's motion from rest to its design stop, in the model frame and metres: rigid stages run one after another,
 * each through its `share` of the clock. A hinge turns `angle` degrees about the line `from` → `to`, signed by the
 * right-hand rule; a slide moves `travel` along `direction`. Every stage is given in the part's rest frame, and the
 * first carries the rest; see `src/motion.ts`, `posePoint`. A far-side twin's motion is not stored; see
 * `src/motion.ts`, `mirrorMotion`.
 */
export const MotionSchema = pipe(
  array(
    variant('kind', [
      strictObject({
        kind: literal('hinge'),
        axis: pipe(
          strictObject({ from: ModelPointSchema, to: ModelPointSchema }),
          check(({ from, to }) => from.some((value, axis) => value !== to[axis]), 'hinge axis needs two distinct points'),
        ),
        angle: pipe(
          number(),
          finite(),
          check((angle) => angle !== 0 && Math.abs(angle) <= 180, 'hinge angle must be nonzero, at most a half turn'),
        ),
        share: ShareSchema,
      }),
      strictObject({ kind: literal('slide'), direction: UnitVectorSchema, travel: positive, share: ShareSchema }),
    ]),
  ),
  nonEmpty(),
  check((stages) => Math.abs(stages.reduce((sum, { share }) => sum + share, 0) - 1) <= 1e-9, 'stage shares must sum to 1'),
);

export const NeutralModelSchema = strictObject({
  id: Id,
  file: pipe(string(), regex(/^assets\/models\/[a-z0-9_-]+\.glb$/, 'expected "assets/models/<name>.glb"')),
  parts: optional(
    pipe(
      record(pipe(string(), nonEmpty()), ModelPartSchema),
      check((parts) => Object.keys(parts).length > 0, 'assembly needs physical parts'),
    ),
  ),
  /** Drawn collision for atomic models, whose mass belongs to the item rather than body parts. */
  collision: optional(pipe(array(ModelBoxSchema), nonEmpty('baked collision needs a box'))),
  emissiveMaterial: optional(pipe(string(), nonEmpty('must not be empty'))),
  /** Finish slots a host repaints on its copy; the GLB marks their materials `paintable` in their extras. */
  paintable: optional(pipe(array(Id), nonEmpty('lists no slot'))),
  /**
   * The doll parts, or pieces of the part a worn shell is drawn on, that a consumer stops drawing while the shell is
   * worn: skin lying flush under a shell would show through it.
   */
  covers: optional(
    pipe(
      array(Id),
      nonEmpty('covers nothing'),
      check((ids) => new Set(ids).size === ids.length, 'covers one twice'),
    ),
  ),
  /**
   * Where the hand holds the model, and the XYZ Euler turn in degrees that carries the file's axes onto the held axes,
   * working end +z and up +y, so a model that faces its working end forward needs none.
   */
  grip: optional(strictObject({ at: ModelPointSchema, turn: optional(ModelPointSchema) })),
  /** How the held axes sit in the hand: forward points the working end ahead, upright raises it. */
  hold: optional(picklist(['forward', 'upright'])),
  /** How the model rests on the ground: upright stands it on its −z end, the axis an upright hold raises. */
  rest: optional(picklist(['lying', 'upright'])),
  /** Degrees about +z, the working end, applied to the model before its grip turn. */
  roll: optional(pipe(number(), finite(), minValue(-180), maxValue(180))),
  anchors: optional(record(Id, ModelPointSchema)),
  /** How the part moves on whatever carries it, the same wherever it is placed. */
  motion: optional(MotionSchema),
  /** The screen of an item that shows something. */
  display: optional(
    pipe(
      strictObject(surfaceEntries),
      check(({ normal, up }) => Math.abs(dotOf(normal, up)) <= 1e-6, 'display up must be across its normal'),
    ),
  ),
  /**
   * What is printed on a packaged item and where: the consumer draws the text itself, so the GLB stays free of
   * baked lettering and a relabel never changes the model's bytes.
   */
  label: optional(
    pipe(
      strictObject({ ...surfaceEntries, text: Name }),
      check(({ normal, up }) => Math.abs(dotOf(normal, up)) <= 1e-6, 'label up must be across its normal'),
    ),
  ),
});

export const modelSchema = <const Packs extends ObjectEntries>(packs: Packs) => {
  for (const key of Object.keys(packs)) {
    if (Object.hasOwn(NeutralModelSchema.entries, key)) {
      throw new Error(`Pack block ${key} would replace a neutral model field`);
    }
  }
  return strictObject({ ...NeutralModelSchema.entries, ...packs });
};

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type NeutralModel = DeepReadonly<InferOutput<typeof NeutralModelSchema>>;
export type ModelParts = NonNullable<NeutralModel['parts']>;
export type ModelBox = DeepReadonly<InferOutput<typeof ModelBoxSchema>>;
export type Motion = DeepReadonly<InferOutput<typeof MotionSchema>>;
export type MotionStage = Motion[number];
export type HingeAxis = Extract<MotionStage, { kind: 'hinge' }>['axis'];
