import {
  check,
  finite,
  type InferOutput,
  maxValue,
  minValue,
  nonEmpty,
  number,
  optional,
  parse,
  picklist,
  pipe,
  record,
  strictObject,
  string,
  tuple,
} from 'valibot';
import content from '../../../../models/finishes.json' with { type: 'json' };

const Fraction = pipe(number(), finite(), minValue(0), maxValue(1));
const Colour = tuple([Fraction, Fraction, Fraction]);
const Metres = pipe(number(), finite(), check((metres) => metres > 0, 'must be a positive length in metres'));

/** The surface patterns a renderer draws a fabric finish's grain with, one per kind of cloth, hide or rubber. */
export const FABRIC_KINDS = ['woven', 'twill', 'knit', 'felt', 'leather', 'rubber'] as const;

/**
 * A finish's fabric grain, drawn by the renderer over its flat colour in the model's own axes, since the export
 * carries no texture coordinates. The why is in `docs/decisions/0013-fabric-finishes.md`, "Decision".
 */
const FabricSchema = strictObject({
  kind: picklist(FABRIC_KINDS),
  /** The pattern's repeat, such as one thread or one knit loop, in metres. */
  grain: Metres,
  /** How far the grain tilts the surface's normal, as a share of the strongest relief a renderer draws. */
  relief: Fraction,
  /** How far each thread or cell's lightness strays from the colour, as a share of it. */
  noise: Fraction,
  /** How much darker the cloth falls in its folds, as a share of the colour. */
  crease: Fraction,
  /** The folds' size in metres. */
  fold: Metres,
});

const FinishSchema = pipe(
  strictObject({
    metallic: Fraction,
    roughness: Fraction,
    /** Below 1 is see-through, such as glazing; omitted is opaque. */
    opacity: optional(Fraction),
    /** A tint the surface reflects at grazing angles, such as a coated lens; omitted reflects untinted. */
    sheen: optional(strictObject({ colour: Colour, roughness: Fraction })),
    fabric: optional(FabricSchema),
    /**
     * A clear layer over the paint for renderers that can draw one. `metallic` replaces the finish's own under
     * the coat, because an uncoated finish may fake its gloss with metalness; the finish's own serves the rest.
     */
    clearcoat: optional(strictObject({ amount: Fraction, roughness: Fraction, metallic: Fraction })),
  }),
  check(
    ({ fabric, metallic, sheen }) => fabric === undefined || (metallic === 0 && sheen !== undefined),
    'a fabric finish is not metallic and has a sheen, since fibres scatter rather than mirror the light',
  ),
);
export const MaterialSchema = strictObject({ colour: Colour, finish: FinishSchema });

export const MATERIALS = parse(record(string(), MaterialSchema), content);
export type MaterialDef = InferOutput<typeof MaterialSchema>;
export type FabricDef = NonNullable<MaterialDef['finish']['fabric']>;

/**
 * How every renderer draws a finish's see-through, sheen and coat, so a model looks the same in each. A see-through
 * surface writes no depth, because that would hide what lies behind it from later draws.
 */
export const surfaceOf = (finish: MaterialDef['finish']) => {
  const opacity = finish.opacity ?? 1;
  return { opacity, transparent: opacity < 1, depthWrite: opacity >= 1, sheen: finish.sheen, clearcoat: finish.clearcoat };
};
export const MaterialReferenceSchema = strictObject({
  materialId: pipe(string(), nonEmpty()),
  colourMultiplier: tuple([Fraction, Fraction, Fraction]),
});
