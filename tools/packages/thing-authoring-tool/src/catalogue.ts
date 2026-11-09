import type { Assembly, Domain, PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { validate } from '@skelly/construct/assembly/validate.ts';
import { applyDir, applyPoint, scale, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { MATERIALS } from '@skelly/thing-core/materials';
import { ModelPointSchema, type NeutralModel, NeutralModelSchema } from '@skelly/thing-core/schema';
import { singlePart } from '@skelly/thing-core/single-part';
import { drawnGeometry } from '@skelly/thing-export/drawn.ts';
import type { Palette, VoxelGrains } from '@skelly/thing-export/exportTypes.ts';
import { hex } from '@skelly/thing-export/glb.ts';
import {
  array,
  boolean,
  check,
  finite,
  type InferOutput,
  integer,
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
} from 'valibot';
import content from '../items.json' with { type: 'json' };
import { avatarArm, avatarLeg } from './families/avatarLimbs.ts';
import { bearTrap } from './families/bearTrap.ts';
import { block } from './families/block.ts';
import { head, limb, torso } from './families/body.ts';
import { bust } from './families/bust.ts';
import { bag, boots, cap } from './families/carried.ts';
import { coil } from './families/coil.ts';
import { compound } from './families/compound.ts';
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
  ports: array(PortSchema),
});
const ItemSchema = strictObject({
  id: name,
  exportMass: picklist(['parts', 'inventory-atom']),
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
  /** Named datums on solids, exported as the model's anchors. */
  anchors: optional(record(pipe(string(), regex(/^[a-z0-9_]+$/)), strictObject(SolidPointSchema))),
  /** The screen's centre on a solid, and the way it faces and its top points in that part's frame. */
  display: optional(strictObject({ ...SolidPointSchema, normal: ModelPointSchema, up: ModelPointSchema })),
  /**
   * The face of a solid that carries the item's print, and the print's text, which defaults to the model's display
   * name. The part defaults to the item's first, which is a compound's only one; the top defaults to +y on a side
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
  /** The model's shelf and facet tags; the repository build holds them to its vocabulary, so this tool only carries them. */
  taxonomy: optional(unknown()),
});
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
  return { family: part.family, solids, ports: part.ports, axes: [], keepOuts: [] };
};
export const loadCatalogue = (value: unknown = content) => {
  const data = parse(CatalogueSchema, value);
  for (const item of data.items) {
    for (const part of item.parts) {
      buildPart(part, part.params, data.turnedSides);
    }
  }
  return data;
};
export const catalogue = loadCatalogue();
export const palette: Palette = {
  familyColors: {},
  specialColors: {},
  materials: MATERIALS,
  fallbackColor: MATERIALS[catalogue.defaultMaterial]!.colour,
  fallbackFinish: MATERIALS[catalogue.defaultMaterial]!.finish,
};

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

/** Builds an item; with a model export's grains its datums read off the drawn voxels (see `drawn.ts`). */
export const buildItem = (item: ToolItem, voxel?: VoxelGrains) => {
  const first = item.parts[0]!;
  let assembly: Assembly;
  let domain: Domain;
  let masses: Readonly<Record<string, number>>;
  if (item.parts.length === 1) {
    const wrapped = singlePart({ id: first.id, part: buildPart(first, first.params, catalogue.turnedSides), massKg: first.massKg, units: catalogue.units });
    assembly = {
      ...wrapped.assembly,
      name: item.id,
      parts: { [first.id]: { family: first.family, appearance: { finish: first.finish } } },
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
          build: (params: Readonly<Record<string, string>>) => ({ ...buildPart(part, params, catalogue.turnedSides), family: part.id }),
        },
      ]),
    );
    assembly = {
      name: item.id,
      root: first.id,
      parts: Object.fromEntries(
        item.parts.map((part) => [
          part.id,
          { family: part.id, params: part.params, appearance: { finish: part.finish } },
        ]),
      ),
      connections: item.connections,
    };
    domain = { name: item.id, units: catalogue.units, axisRules: [], families };
    masses = Object.fromEntries(item.parts.map((part) => [part.id, part.massKg]));
  }
  const report = validate(assembly, domain);
  if (report.issues.length > 0) {
    throw new Error(`${item.id}: ${JSON.stringify(report.issues)}`);
  }
  const drawn = drawnGeometry(report.resolved, { ...voxel, revolveFacets: catalogue.facets });
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
    return scale(applyPoint(report.resolved.placed.get(datum.part)!, point), catalogue.units.metresPerUnit);
  };
  const directionIn = (part: string, direction: Vec3): Vec3 => {
    const turned = applyDir(report.resolved.placed.get(part)!, direction);
    return scale(turned, 1 / Math.hypot(...turned));
  };
  let handling: Pick<NeutralModel, 'grip' | 'hold' | 'rest' | 'roll' | 'anchors' | 'display'> = {};
  if (item.handling) {
    const datum = item.handling;
    handling = {
      grip: { at: datumAt(datum), turn: datum.turn },
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
      return across * catalogue.units.metresPerUnit;
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
  return { report, masses, handling, label, drawn, glow: item.glow && glowMaterial(item, item.glow) };
};
