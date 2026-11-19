import {
  array,
  check,
  type GenericSchema,
  type InferOutput,
  integer,
  maxValue,
  minValue,
  nonEmpty,
  number,
  optional,
  picklist,
  pipe,
  record,
  strictObject,
  string,
  tuple,
  boolean as vBoolean,
} from 'valibot';
import { ModelPointSchema as Point } from './modelPoint.ts';
import { MotionSchema, Name } from './motionSchema.ts';
import { OpticApertureSchema } from './opticAperture.ts';
import { ReticleSchema } from './reticle.ts';

/** Callers own temporal brands; the firearm contract owns their structure and relations. */
export interface FirearmPrimitives<PositiveSeconds extends number = number, PerMinute extends number = number> {
  positiveSimSeconds: GenericSchema<number, PositiveSeconds>;
  simPerMinute: GenericSchema<number, PerMinute>;
  id: GenericSchema<string, string>;
  calibreId: GenericSchema<string, string>;
  name: GenericSchema<string, string>;
  positive: GenericSchema<number, number>;
  nonNegative: GenericSchema<number, number>;
  count: GenericSchema<number, number>;
  fraction: GenericSchema<number, number>;
}

export function firearmModelSchema<PositiveSeconds extends number, PerMinute extends number>(
  primitives: FirearmPrimitives<PositiveSeconds, PerMinute>,
) {
  const {
    positiveSimSeconds: PositiveSimSeconds,
    simPerMinute: SimPerMinute,
    id: Id,
    calibreId: CalibreId,
    positive: Positive,
    nonNegative: NonNegative,
    fraction: Fraction,
  } = primitives;
  const UnitVector = pipe(
    Point,
    check(([x, y, z]) => Math.abs(Math.hypot(x, y, z) - 1) <= 1e-6, 'must be a unit vector'),
  );

  const ActionCycleSchema = pipe(
    strictObject({
      durationSimSeconds: PositiveSimSeconds,
      legs: pipe(array(strictObject({ to: Name, seconds: PositiveSimSeconds })), nonEmpty('needs at least one leg')),
    }),
    check(
      (cycle) => cycle.legs.reduce((sum, { seconds }) => sum + seconds, 0) <= cycle.durationSimSeconds + 1e-9,
      'cycle legs must fit within durationSimSeconds',
    ),
  );
  const ActionPartSchema = strictObject({
    node: Name,
    handGrip: optional(Point),
    motion: MotionSchema,
    modes: pipe(
      array(picklist(['fire', 'hand'])),
      nonEmpty('needs at least one cycle mode'),
      check((modes) => new Set(modes).size === modes.length, 'cycle modes must be distinct'),
    ),
  });
  const ActionSchema = pipe(
    strictObject({
      parts: pipe(
        record(Id, ActionPartSchema),
        check((parts) => Object.keys(parts).length > 0, 'needs at least one moving part'),
      ),
      fire: optional(ActionCycleSchema),
      hand: ActionCycleSchema,
      ejectAt: Fraction,
      ejectDirection: UnitVector,
      holdOpen: vBoolean(),
      roundsPerSimMinute: optional(SimPerMinute),
      triggerMode: optional(picklist(['semi', 'auto'])),
    }),
    check(
      (action) => Object.values(action.parts).every((part) => part.modes.every((mode) => action[mode] !== undefined)),
      'moving part modes must reference a declared timeline',
    ),
    check(
      (action) =>
        Object.values(action.parts).every(({ motion, modes }) =>
          modes.every((mode) =>
            (action[mode]?.legs ?? []).every(({ to }) => motion.stops.some((stop) => stop.name === to)),
          ),
        ),
      'every timeline leg must go to a stop of each part that follows it',
    ),
    check(
      (action) =>
        Object.values(action.parts).every(({ motion, modes }) =>
          modes.every((mode) => (action[mode]?.legs.at(-1)?.to ?? motion.stops[0]?.name) === motion.stops[0]?.name),
        ),
      'every timeline must end with its parts back at rest',
    ),
    check(
      (action) => (action.fire === undefined) === (action.roundsPerSimMinute === undefined),
      'only an automatic fire timeline has a cyclic rpm',
    ),
    check(
      (action) => action.triggerMode === undefined || action.fire !== undefined,
      'trigger mode needs a fire timeline',
    ),
  );
  const RevolverRotationSchema = strictObject({
    node: pipe(string(), nonEmpty('must not be empty')),
    pivot: Point,
    axis: UnitVector,
  });
  const RevolverSchema = pipe(
    strictObject({
      chambers: pipe(number(), integer('must be a whole number'), minValue(1)),
      crane: strictObject({
        ...RevolverRotationSchema.entries,
        openRadians: pipe(
          number(),
          check((value) => Number.isFinite(value) && value !== 0, 'needs a finite nonzero angle'),
        ),
      }),
      cylinder: strictObject({
        node: pipe(string(), nonEmpty('must not be empty')),
        centre: Point,
        axis: UnitVector,
        chamberRadiusMetres: Positive,
        chamberZeroRadians: pipe(
          number(),
          check((value) => Number.isFinite(value), 'must be finite'),
        ),
      }),
      ejector: strictObject({
        node: pipe(string(), nonEmpty('must not be empty')),
        axis: UnitVector,
        strokeMetres: Positive,
      }),
      hammer: strictObject({
        ...RevolverRotationSchema.entries,
        cockRadians: pipe(
          number(),
          check((value) => Number.isFinite(value) && value !== 0, 'needs a finite nonzero angle'),
        ),
      }),
      trigger: strictObject({
        ...RevolverRotationSchema.entries,
        pullRadians: pipe(
          number(),
          check((value) => Number.isFinite(value) && value !== 0, 'needs a finite nonzero angle'),
        ),
      }),
    }),
    check(
      (value) =>
        new Set([value.crane.node, value.cylinder.node, value.ejector.node, value.hammer.node, value.trigger.node])
          .size === 5,
      'revolver parts need distinct nodes',
    ),
  );
  const MagazineRoundSchema = strictObject({ at: Point, tilt: number() });
  const MagazineCapacity = pipe(number(), integer('must be a whole number'), minValue(1, 'must be at least 1'));
  const AttachmentPropertiesSchema = strictObject({
    magnification: optional(
      pipe(
        strictObject({ min: Positive, max: Positive }),
        check(({ min, max }) => max >= min, 'maximum magnification cannot be below minimum'),
      ),
    ),
    aperture: optional(OpticApertureSchema),
    reticle: optional(ReticleSchema),
    noiseFactor: optional(Fraction),
    wearClass: optional(picklist(['real', 'improvised'])),
    handlingClass: optional(pipe(string(), nonEmpty('must not be empty'))),
    railSpanNotches: optional(
      pipe(
        strictObject({
          minOffset: pipe(number(), integer('must be a whole number')),
          maxOffset: pipe(number(), integer('must be a whole number')),
        }),
        check(({ minOffset, maxOffset }) => minOffset <= maxOffset, 'maximum notch offset cannot be below minimum'),
      ),
    ),
  });
  const SightEyeRangeSchema = pipe(
    tuple([NonNegative, Positive]),
    check(([near, far]) => near < far, 'iron eye range must have near < far'),
  );
  const AttachmentSightSchema = pipe(
    strictObject({
      kind: picklist(['optic', 'iron']),
      eye: Point,
      direction: UnitVector,
      up: UnitVector,
      eyeReliefMetres: Positive,
      eyeDistanceRangeMetres: optional(SightEyeRangeSchema),
      ocularDiameterMetres: optional(Positive),
    }),
    check(
      ({ kind, eyeDistanceRangeMetres }) => (kind === 'iron') === (eyeDistanceRangeMetres !== undefined),
      'only iron sights require an eye distance range',
    ),
  );
  const AttachmentFieldsSchema = strictObject({
    id: pipe(string(), nonEmpty('must not be empty')),
    kind: picklist(['optic', 'iron-sight', 'suppressor', 'flashlight-mount', 'foregrip', 'muzzle-device']),
    mount: picklist(['rail-top', 'rail-side', 'rail-bottom', 'muzzle']),
    mountFrame: strictObject({ normal: UnitVector, up: UnitVector }),
    properties: AttachmentPropertiesSchema,
    sight: optional(AttachmentSightSchema),
  });
  const attachmentSpanMatchesMount = ({ mount, properties }: InferOutput<typeof AttachmentFieldsSchema>): boolean =>
    mount === 'muzzle' ? properties.railSpanNotches === undefined : properties.railSpanNotches !== undefined;
  const attachmentHasOpticPresentation = ({ kind, properties }: InferOutput<typeof AttachmentFieldsSchema>): boolean =>
    (kind === 'optic') === (properties.reticle !== undefined) &&
    (kind === 'optic') === (properties.aperture !== undefined);
  const AttachmentSchema = pipe(
    AttachmentFieldsSchema,
    check(attachmentSpanMatchesMount, 'rail attachments need a notch span and muzzle attachments cannot have one'),
    check(
      attachmentHasOpticPresentation,
      'optics need an authored reticle and aperture; other attachments cannot have them',
    ),
    check(
      ({ kind, properties }) => (kind === 'suppressor') === (properties.noiseFactor !== undefined),
      'suppressors need a noise factor and other attachments cannot have one',
    ),
  );
  const FittedAttachmentSchema = pipe(
    strictObject({
      ...AttachmentFieldsSchema.entries,
      node: pipe(string(), nonEmpty('must not be empty')),
      mountedAt: pipe(string(), nonEmpty('must not be empty')),
    }),
    check(
      (value) => attachmentHasOpticPresentation(value),
      'optics need an authored reticle and aperture; other attachments cannot have them',
    ),
    check(
      (value) => attachmentSpanMatchesMount(value),
      'rail attachments need a notch span and muzzle attachments cannot have one',
    ),
  );
  const AttachmentSlotSchema = pipe(
    strictObject({
      id: pipe(string(), nonEmpty('must not be empty')),
      mount: picklist(['rail-top', 'rail-side', 'rail-bottom', 'muzzle']),
      position: Point,
      direction: UnitVector,
      up: UnitVector,
      railId: optional(pipe(string(), nonEmpty('must not be empty'))),
      notchIndex: optional(pipe(number(), integer('must be a whole number'), minValue(0, 'must be non-negative'))),
    }),
    check(
      ({ mount, railId, notchIndex }) =>
        mount === 'muzzle'
          ? railId === undefined && notchIndex === undefined
          : railId !== undefined && notchIndex !== undefined,
      'rail slots need railId and notchIndex; muzzle interfaces cannot have them',
    ),
  );
  const AttachmentCompatibilityChoiceSchema = tuple([
    pipe(string(), nonEmpty('must not be empty')),
    pipe(string(), nonEmpty('must not be empty')),
  ]);
  const AttachmentCompatibilityPairSchema = tuple([
    AttachmentCompatibilityChoiceSchema,
    AttachmentCompatibilityChoiceSchema,
  ]);
  const ModelMagazineSlotSchema = strictObject({
    node: pipe(string(), nonEmpty('must not be empty')),
    at: Point,
    turn: Point,
  });
  const attachmentRangesDoNotOverlap = (
    attachments: readonly InferOutput<typeof FittedAttachmentSchema>[],
    slots: readonly InferOutput<typeof AttachmentSlotSchema>[],
  ): boolean => {
    const ranges = attachments.flatMap(({ mountedAt, properties }) => {
      const slot = slots.find(({ id }) => id === mountedAt);
      const span = properties.railSpanNotches;
      return slot?.railId !== undefined && slot.notchIndex !== undefined && span
        ? [{ railId: slot.railId, min: slot.notchIndex + span.minOffset, max: slot.notchIndex + span.maxOffset }]
        : [];
    });
    return ranges.every((a, index) =>
      ranges.slice(index + 1).every((b) => a.railId !== b.railId || a.max < b.min || b.max < a.min),
    );
  };
  return pipe(
    strictObject({
      calibre: optional(CalibreId),
      capacity: optional(MagazineCapacity),
      internalMagazine: optional(strictObject({ capacity: MagazineCapacity })),
      rounds: optional(array(MagazineRoundSchema)),
      attachments: optional(array(FittedAttachmentSchema)),
      attachmentSlots: optional(array(AttachmentSlotSchema)),
      compatibility: optional(
        record(pipe(string(), nonEmpty('must not be empty')), array(pipe(string(), nonEmpty('must not be empty')))),
      ),
      compatibilityPairs: optional(array(AttachmentCompatibilityPairSchema)),
      slots: optional(strictObject({ magazine: optional(ModelMagazineSlotSchema) })),
      attachment: optional(AttachmentSchema),
      adsStandoffMetres: optional(Positive),
      sight: optional(
        strictObject({
          kind: picklist(['iron', 'optic']),
          eye: Point,
          eyeReliefMetres: NonNegative,
          eyeDistanceRangeMetres: optional(SightEyeRangeSchema),
          ocularDiameterMetres: optional(Positive),
          direction: UnitVector,
          up: UnitVector,
        }),
      ),
      muzzleDirection: optional(UnitVector),
      action: optional(ActionSchema),
      revolver: optional(RevolverSchema),
      chargingHandleDegrees: optional(pipe(number(), minValue(-180), maxValue(180))),
    }),
    check(
      ({ calibre, capacity, rounds }) =>
        capacity === undefined && rounds === undefined
          ? true
          : calibre !== undefined && capacity !== undefined && rounds !== undefined && rounds.length === capacity,
      'magazine metadata needs calibre, capacity, and one round pose per capacity slot',
    ),
    check(
      ({ attachments, attachmentSlots }) =>
        attachments === undefined ||
        (attachmentSlots !== undefined &&
          new Set(attachments.map(({ mountedAt }) => mountedAt)).size === attachments.length &&
          attachments.every(({ mountedAt, mount }) =>
            attachmentSlots.some((slot) => slot.id === mountedAt && slot.mount === mount),
          ) &&
          attachmentRangesDoNotOverlap(attachments, attachmentSlots)),
      'fitted attachments need unique matching mount slots and non-overlapping rail spans',
    ),
    check(
      ({ sight }) => sight?.kind !== 'optic' || sight.ocularDiameterMetres !== undefined,
      'optic sight metadata needs an ocular opening diameter',
    ),
    check(
      ({ sight }) => sight === undefined || (sight.kind === 'iron') === (sight.eyeDistanceRangeMetres !== undefined),
      'only iron sights require an eye distance range',
    ),
    check(
      ({ internalMagazine, calibre, capacity, rounds }) =>
        internalMagazine === undefined || (calibre !== undefined && capacity === undefined && rounds === undefined),
      'internal magazine metadata needs calibre and cannot carry a box round column',
    ),
  );
}
