import type { Assembly, Domain, PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { validate } from '@skelly/construct/assembly/validate.ts';
import { applyDir, applyPoint, dot, rotation, scale, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { FORWARDS, type Forward, FRONT_TURNS, fileGripTurn } from '@skelly/thing-core/frame';
import { MATERIALS } from '@skelly/thing-core/materials';
import { centreOf, cornersOf, hingeSense, piecesBounds, pinAxis, shareStages, type StageMove, TOWARD, TOWARDS } from '@skelly/thing-core/motion';
import {
  ModelPointSchema,
  type Motion,
  type NeutralModel,
  NeutralModelSchema,
  OpenAngleSchema,
} from '@skelly/thing-core/schema';
import { singlePart } from '@skelly/thing-core/single-part';
import { drawnGeometry } from '@skelly/thing-export/drawn.ts';
import type { Palette, VoxelGrains } from '@skelly/thing-export/exportTypes.ts';
import { hex } from '@skelly/thing-export/glb.ts';
import { TitleSchema } from '@skelly/thing-export/title.ts';
import {
  array,
  boolean,
  check,
  finite,
  type InferOutput,
  integer,
  literal,
  minValue,
  nonEmpty,
  number,
  optional,
  parse,
  picklist,
  pipe,
  record,
  regex,
  strictObject,
  string,
  unknown,
  variant,
} from 'valibot';
import { avatarArm, avatarLeg } from './families/avatarLimbs.ts';
import { bearTrap } from './families/bearTrap.ts';
import { block } from './families/block.ts';
import { head, limb, torso } from './families/body.ts';
import { bust } from './families/bust.ts';
import { bag, boots, cap } from './families/carried.ts';
import { coil } from './families/coil.ts';
import { compound, compoundPieces } from './families/compound.ts';
import { blowtorch, headlamp, pliers, portableRadio, repairKit, webbingSling } from './families/equipment.ts';
import { drinkCup, foodPortion, stemmedFruit, woundRoll } from './families/food-medical.ts';
import { fuse } from './families/fuse.ts';
import { foldedGarment } from './families/garment.ts';
import { grenade } from './families/grenade.ts';
import { compass, keycard, key as keyFamily, lighter, matchbox } from './families/handheld.ts';
import { handOpener } from './families/handOpener.ts';
import { bottleJack, engineHoist, scissorJack } from './families/jacks.ts';
import { arm, base, chimney, reservoir, shade } from './families/lamp.ts';
import { candle, flashlight, torch } from './families/lights.ts';
import { cutStock, foldedSheet, turnedStock } from './families/materials.ts';
import { bat, crowbar, hammer, knife, sledgehammer, steelPipe, wrench } from './families/melee.ts';
import { openTin } from './families/openTin.ts';
import { carton, vessel } from './families/package.ts';
import { ring } from './families/ring.ts';
import { spool } from './families/spool.ts';
import { SkinSchema } from './skin.ts';

const FACES = ['+x', '-x', '+y', '-y', '+z', '-z'] as const;
type Face = (typeof FACES)[number];
const faceAxis = (face: Face): Vec3 => {
  const axis = 'xyz'.indexOf(face[1]!);
  return [0, 1, 2].map((at) => (at === axis ? (face[0] === '+' ? 1 : -1) : 0)) as unknown as Vec3;
};
const defaultUp: Readonly<Record<Face, Face>> = { '+x': '+y', '-x': '+y', '+z': '+y', '-z': '+y', '+y': '-z', '-y': '+z' };
const positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const name = pipe(string(), nonEmpty());
const material = pipe(
  name,
  check((id) => Object.hasOwn(MATERIALS, id), 'unknown shared material'),
);
const PortSchema = strictObject({
  id: name,
  mount: name,
  gender: picklist(['male', 'female']),
  standard: optional(name),
  accepts: optional(pipe(array(name), nonEmpty())),
  envelope: optional(
    pipe(
      strictObject({ min: ModelPointSchema, max: ModelPointSchema }),
      check(({ min, max }) => min.every((value, axis) => value < max[axis]!), 'envelope min must lie below its max'),
    ),
  ),
  pos: ModelPointSchema,
  normal: ModelPointSchema,
  up: ModelPointSchema,
  required: boolean(),
});
const SolidPointSchema = {
  part: name,
  solid: name,
  fraction: pipe(
    ModelPointSchema,
    check((point) => point.every((value) => value >= 0 && value <= 1), 'datum fraction outside solid'),
  ),
};
const PartSchema = strictObject({
  id: name,
  family: name,
  params: record(name, string()),
  massKg: positive,
  finish: record(name, material),
  /**
   * The finish slots a vehicle fitting's finish repaints on this part's copy. Glass, tyres and chrome are never
   * listed, so a repaint leaves them as authored.
   */
  paintable: optional(
    pipe(
      array(name),
      nonEmpty(),
      check((slots) => new Set(slots).size === slots.length, 'duplicate paintable slot'),
    ),
  ),
  ports: array(PortSchema),
});
const ItemSchema = pipe(
  strictObject({
    id: name,
    /** What the item is called wherever it is listed or printed; authored, never derived from the id. */
    title: TitleSchema,
    exportMass: picklist(['parts', 'inventory-atom']),
    /**
     * The axis the row puts its front on, or a held thing its working end, when that is not +z: a kit laid out along
     * another axis names it once, and the build turns the model onto +z. Defaults to the family's, else +z.
     */
    forward: optional(picklist(FORWARDS)),
    skin: optional(SkinSchema),
    parts: pipe(
      array(PartSchema),
      nonEmpty(),
      check((parts) => new Set(parts.map(({ id }) => id)).size === parts.length, 'duplicate part id'),
    ),
    connections: array(strictObject({ from: name, to: name })),
    handling: optional(
      strictObject({
        ...SolidPointSchema,
        turn: ModelPointSchema,
        hold: NeutralModelSchema.entries.hold,
        rest: NeutralModelSchema.entries.rest,
        roll: NeutralModelSchema.entries.roll,
      }),
    ),
    covers: optional(NeutralModelSchema.entries.covers),
    /** Named datums on solids, exported as the model's anchors. */
    anchors: optional(record(pipe(string(), regex(/^[a-z0-9_]+$/)), strictObject(SolidPointSchema))),
    /**
     * How a compound part of the item moves on whatever carries it, from rest to its authored stop, in stages run one
     * after another: a hinge turning on pins drawn on the part, toward a direction, or a slide along one. Exported in
     * the model frame; see `docs/decisions/0015-motion-as-content.md`.
     */
    motion: optional(
      strictObject({
        part: name,
        stages: pipe(
          array(
            variant('kind', [
              strictObject({
                kind: literal('hinge'),
                pins: pipe(array(name), nonEmpty()),
                toward: picklist(TOWARDS),
                open: OpenAngleSchema,
              }),
              strictObject({ kind: literal('slide'), toward: picklist(TOWARDS), travel: positive, stow: optional(literal(true)) }),
            ]),
          ),
          nonEmpty(),
        ),
      }),
    ),
    /** The screen's centre on a solid, and the way it faces and its top points in that part's frame. */
    display: optional(strictObject({ ...SolidPointSchema, normal: ModelPointSchema, up: ModelPointSchema })),
    /**
     * The face of a solid that carries the item's print, and the print's text, which defaults to the model's title.
     * The part defaults to the item's first, which is a compound's only one; the top defaults to +y on a side
     * face, and to the back on the top or bottom face, so the text reads from the front.
     */
    label: optional(
      pipe(
        strictObject({
          part: optional(name),
          solid: name,
          face: picklist(FACES),
          up: optional(picklist(FACES)),
          text: optional(name),
        }),
        check(({ face, up }) => up === undefined || up[1] !== face[1], 'label up must be across its face'),
      ),
    ),
    /** The finish slot that glows while lit; its material must be the only one that slot's finish names in the item. */
    glow: optional(name),
    /** The item's own voxel grain in metres, in place of its class grain; the export recipe resolves it. */
    voxelGrain: optional(positive),
    /** The voxel class the item is drawn on, in place of its recipe's; the export recipe resolves the name. */
    voxelClass: optional(name),
    /** The model's shelf and facet tags; the repository build holds them to its vocabulary, so this tool only carries them. */
    taxonomy: optional(unknown()),
  }),
  // Pivots are not attach points: a part that moves turns on its pins, never on hinge anchors.
  check(
    ({ motion, anchors = {} }) => !motion || !('hinge_a' in anchors || 'hinge_b' in anchors),
    'a row with a motion carries no hinge_a or hinge_b anchor',
  ),
);
const CatalogueSchema = strictObject({
  units: strictObject({ metresPerUnit: positive, grid: positive, bevel: pipe(number(), finite(), minValue(0)) }),
  facets: pipe(positive, integer(), minValue(3)),
  turnedSides: optional(pipe(positive, integer(), minValue(3))),
  defaultMaterial: material,
  items: pipe(
    array(ItemSchema),
    nonEmpty(),
    check((items) => new Set(items.map(({ id }) => id)).size === items.length, 'duplicate item id'),
  ),
});
export type Catalogue = InferOutput<typeof CatalogueSchema>;
/** What every item's build reads besides the item. */
export type CatalogueSettings = Omit<Catalogue, 'items'>;
export type ToolItem = InferOutput<typeof ItemSchema>;
type ToolPart = ToolItem['parts'][number];
type ToolDatum = NonNullable<ToolItem['handling']>;
const builders = {
  block,
  ring,
  spool,
  coil,
  compound,
  fuse,
  crowbar,
  hammer,
  sledgehammer,
  bat,
  knife,
  wrench,
  steelPipe,
  compass,
  lighter,
  matchbox,
  key: keyFamily,
  keycard,
  cylinder: base,
  arm,
  shade,
  reservoir,
  chimney,
  carton,
  vessel,
  'folded-garment': foldedGarment,
  bag,
  boots,
  cap,
  limb,
  torso,
  head,
  bust,
  avatarArm,
  avatarLeg,
  openTin,
  handOpener,
  grenade,
  bearTrap,
  cutStock,
  foldedSheet,
  turnedStock,
  foodPortion,
  drinkCup,
  stemmedFruit,
  woundRoll,
  blowtorch,
  headlamp,
  pliers,
  portableRadio,
  repairKit,
  webbingSling,
  scissorJack,
  bottleJack,
  engineHoist,
  torch,
  flashlight,
  candle,
} satisfies Record<string, (params: Readonly<Record<string, string>>, turnedSides?: number) => readonly Solid[]>;
/**
 * The families whose builders lay a model out with its front, or working end, off +z: tools and stock measured along
 * their length on x, and the headlamp, whose lens faces -z. A family whose things have no front in use (sheets, tape
 * rings, cut stock, kits, slings) is absent: its source lays the longest side along x, as the fallback in
 * docs/decisions/0002-model-frame.md asks.
 */
const FAMILY_FORWARDS: Readonly<Partial<Record<string, Forward>>> = {
  crowbar: '+x',
  hammer: '+x',
  sledgehammer: '+x',
  bat: '+x',
  knife: '+x',
  wrench: '+x',
  steelPipe: '+x',
  torch: '+x',
  candle: '+x',
  flashlight: '+x',
  blowtorch: '+x',
  pliers: '+x',
  turnedStock: '+x',
  handOpener: '+x',
  headlamp: '-z',
};
const buildPart = (part: ToolPart, params = part.params, turnedSides?: number): PartDef => {
  if (!Object.hasOwn(builders, part.family)) {
    throw new Error(`Unknown thing family ${part.family}`);
  }
  // Compound consumes per-piece null opt-outs itself; other families emit ordinary revolved solids.
  const solids = part.family === 'compound'
    ? compound(params, turnedSides)
    : builders[part.family as keyof typeof builders](params, turnedSides).map((solid): Solid =>
      solid.kind === 'revolved' && solid.sides === undefined && turnedSides !== undefined
        ? { ...solid, sides: turnedSides }
        : solid,
    );
  for (const solid of solids) {
    if (!(solid.slot && Object.hasOwn(part.finish, solid.slot))) {
      throw new Error(`Missing finish for ${part.id}/${solid.id}`);
    }
  }
  for (const slot of part.paintable ?? []) {
    if (!solids.some((solid) => solid.slot === slot && solid.material === undefined)) {
      throw new Error(`${part.id}: paintable slot ${slot} colours no solid`);
    }
  }
  return { family: part.family, solids, ports: part.ports, axes: [], keepOuts: [] };
};
export const loadCatalogue = (value: unknown): Catalogue => {
  const data = parse(CatalogueSchema, value);
  for (const item of data.items) {
    for (const part of item.parts) {
      buildPart(part, part.params, data.turnedSides);
    }
  }
  return data;
};
export const itemPalette = ({ defaultMaterial }: Pick<CatalogueSettings, 'defaultMaterial'>): Palette => ({
  familyColors: {},
  specialColors: {},
  materials: MATERIALS,
  fallbackColor: MATERIALS[defaultMaterial]!.colour,
  fallbackFinish: MATERIALS[defaultMaterial]!.finish,
});

/** The glTF material name of the item's glow slot; the writer merges same-material slots, so the glow's must be its own. */
const glowMaterial = (item: ToolItem, slot: string): string => {
  const finishes = item.parts.flatMap(({ finish }) => Object.entries(finish));
  const glowing = new Set(finishes.filter(([key]) => key === slot).map(([, finish]) => finish));
  const [id] = glowing;
  if (!(id && glowing.size === 1)) {
    throw new Error(`${item.id}: glow slot ${slot} needs one material`);
  }
  if (finishes.some(([key, other]) => key !== slot && other === id)) {
    throw new Error(`${item.id}: glow material ${id} is shared with another slot`);
  }
  return hex(MATERIALS[id]!.colour);
};

const partAppearance = ({ finish, paintable }: ToolPart) => ({ finish, ...(paintable ? { paintable } : {}) });

/** The finish slots any part of the item lets a host repaint, in authored order. */
const paintableSlots = (item: ToolItem): readonly string[] => [...new Set(item.parts.flatMap(({ paintable = [] }) => paintable))];

/**
 * The item's motion in the model frame, from the authored shapes of the pins and pieces of its part rather than their
 * voxels, so drawing never moves where the part turns. `built` is the item as built, whose placements carry each part
 * into the model frame and whose drawn voxels fix where a stowing slide's plane lies; the export's voxel grain, in
 * metres, is the tolerance the pins are held to.
 */
export const itemMotion = (
  item: ToolItem,
  settings: CatalogueSettings,
  built: Pick<ReturnType<typeof buildItem>, 'report' | 'drawn'>,
  grain: number,
): Motion | undefined => {
  const authored = item.motion;
  if (!authored) {
    return undefined;
  }
  const part = item.parts.find(({ id }) => id === authored.part);
  if (part?.family !== 'compound') {
    throw new Error(`${item.id}: motion part ${authored.part} is not a compound part of the item`);
  }
  const { metresPerUnit } = settings.units;
  const { defs, placed } = built.report.resolved;
  const place = (point: Vec3): Vec3 => scale(applyPoint(placed.get(part.id)!, point), metresPerUnit);
  const pieces = compoundPieces(part.params);
  const rest = piecesBounds(pieces);
  const centre = place(centreOf(rest));
  const hull = cornersOf(rest).map(place);
  // The voxels draw a little past the authored faces, and a plane cutting the drawn part would clip it at rest.
  const drawnHull = (): Vec3[] => {
    const def = defs.get(part.id)!;
    const measures = (def.displaySolids ?? def.solids).map((solid) => built.drawn.measure(part.id, solid));
    return cornersOf({
      min: [0, 1, 2].map((axis) => Math.min(...measures.map(({ min }) => min[axis]!))) as unknown as Vec3,
      max: [0, 1, 2].map((axis) => Math.max(...measures.map(({ max }) => max[axis]!))) as unknown as Vec3,
    }).map(place);
  };
  const stage = (step: (typeof authored.stages)[number]): StageMove => {
    if (step.kind === 'slide') {
      const direction = TOWARD[step.toward];
      return {
        kind: 'slide',
        direction,
        travel: step.travel * metresPerUnit,
        ...(step.stow ? { stow: Math.max(...drawnHull().map((corner) => dot(corner, direction))) } : {}),
      };
    }
    const pins = step.pins.map((id) => {
      const pin = pieces.find((piece) => piece.id === id);
      if (!pin) {
        throw new Error(`pin ${id} is not a piece of ${part.id}`);
      }
      return pin;
    });
    const drawnOn = pinAxis(pins, grain / metresPerUnit);
    const axis = { from: place(drawnOn.from), to: place(drawnOn.to) };
    return { kind: 'hinge', axis, angle: hingeSense(axis, centre, step.toward, grain) * step.open };
  };
  try {
    return shareStages(authored.stages.map(stage), hull);
  } catch (failure) {
    throw new Error(`${item.id}: ${failure instanceof Error ? failure.message : String(failure)}`);
  }
};

/** Builds an item; with a model export's grains its datums read off the drawn voxels (see `tools/packages/thing-export/src/drawn.ts`). */
export const buildItem = (item: ToolItem, settings: CatalogueSettings, voxel?: VoxelGrains) => {
  const first = item.parts[0]!;
  const forward = item.forward ?? FAMILY_FORWARDS[first.family] ?? '+z';
  const rootPlacement = rotation(FRONT_TURNS[forward]);
  let assembly: Assembly;
  let domain: Domain;
  let masses: Readonly<Record<string, number>>;
  if (item.parts.length === 1) {
    const wrapped = singlePart({ id: first.id, part: buildPart(first, first.params, settings.turnedSides), massKg: first.massKg, units: settings.units });
    assembly = {
      ...wrapped.assembly,
      rootPlacement,
      name: item.id,
      parts: { [first.id]: { family: first.family, appearance: partAppearance(first) } },
      connections: item.connections,
    };
    ({ domain, masses } = wrapped);
  } else {
    const families: Record<string, PartFamily> = Object.fromEntries(
      item.parts.map((part) => [
        part.id,
        {
          name: part.family,
          params: Object.fromEntries(
            Object.entries(part.params).map(([key, value]) => [key, { values: [value], default: value }]),
          ),
          build: (params: Readonly<Record<string, string>>) => ({ ...buildPart(part, params, settings.turnedSides), family: part.id }),
        },
      ]),
    );
    assembly = {
      name: item.id,
      root: first.id,
      rootPlacement,
      parts: Object.fromEntries(
        item.parts.map((part) => [
          part.id,
          { family: part.id, params: part.params, appearance: partAppearance(part) },
        ]),
      ),
      connections: item.connections,
    };
    domain = { name: item.id, units: settings.units, axisRules: [], families };
    masses = Object.fromEntries(item.parts.map((part) => [part.id, part.massKg]));
  }
  const report = validate(assembly, domain);
  if (report.issues.length > 0) {
    throw new Error(`${item.id}: ${JSON.stringify(report.issues)}`);
  }
  const drawn = drawnGeometry(report.resolved, { ...voxel, revolveFacets: settings.facets });
  const drawnSolid = (part: string, solidId: string) => {
    const solid = report.resolved.defs.get(part)?.solids.find(({ id }) => id === solidId);
    if (!(solid && report.resolved.placed.has(part))) {
      throw new Error(`${item.id}: missing datum geometry ${part}/${solidId}`);
    }
    return drawn.measure(part, solid);
  };
  const datumAt = (datum: Pick<ToolDatum, 'part' | 'solid' | 'fraction'>): Vec3 => {
    const { min, max } = drawnSolid(datum.part, datum.solid);
    const point = min.map((value, axis) => value + datum.fraction[axis]! * (max[axis]! - value)) as unknown as Vec3;
    return scale(applyPoint(report.resolved.placed.get(datum.part)!, point), settings.units.metresPerUnit);
  };
  const directionIn = (part: string, direction: Vec3): Vec3 => {
    const turned = applyDir(report.resolved.placed.get(part)!, direction);
    return scale(turned, 1 / Math.hypot(...turned));
  };
  let handling: Pick<NeutralModel, 'grip' | 'hold' | 'rest' | 'roll' | 'anchors' | 'display'> = {};
  if (item.handling) {
    const datum = item.handling;
    handling = {
      grip: { at: datumAt(datum), turn: fileGripTurn(forward, datum.turn) },
      hold: datum.hold,
      ...(datum.rest ? { rest: datum.rest } : {}),
      roll: datum.roll,
    };
  }
  if (item.anchors) {
    handling = {
      ...handling,
      anchors: Object.fromEntries(Object.entries(item.anchors).map(([id, datum]) => [id, datumAt(datum)])),
    };
  }
  // A flat rectangle on a solid, facing a part-frame direction: the solid's extent across and along its top.
  const surfaceOn = (datum: Pick<ToolDatum, 'part' | 'solid' | 'fraction'>, normal: Vec3, up: Vec3) => {
    const { min, max } = drawnSolid(datum.part, datum.solid);
    const extentAlong = (direction: Vec3) => {
      const unit = scale(direction, 1 / Math.hypot(...direction));
      const across = unit.reduce((sum, value, axis) => sum + Math.abs(value) * (max[axis]! - min[axis]!), 0);
      return across * settings.units.metresPerUnit;
    };
    const side: Vec3 = [
      up[1] * normal[2] - up[2] * normal[1],
      up[2] * normal[0] - up[0] * normal[2],
      up[0] * normal[1] - up[1] * normal[0],
    ];
    return {
      at: datumAt(datum),
      normal: directionIn(datum.part, normal),
      up: directionIn(datum.part, up),
      size: [extentAlong(side), extentAlong(up)] as const,
    };
  };
  if (item.display) {
    handling = { ...handling, display: surfaceOn(item.display, item.display.normal, item.display.up) };
  }
  let label: ReturnType<typeof surfaceOn> | undefined;
  if (item.label) {
    const { part = first.id, solid, face, up = defaultUp[face] } = item.label;
    const normal = faceAxis(face);
    const fraction = normal.map((value) => (value + 1) / 2) as [number, number, number];
    label = surfaceOn({ part, solid, fraction }, normal, faceAxis(up));
  }
  return {
    report,
    masses,
    handling,
    label,
    drawn,
    glow: item.glow && glowMaterial(item, item.glow),
    paintable: paintableSlots(item),
  };
};
