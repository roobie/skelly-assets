// The frame tables of the modular AR family (models/guns/tables/<frame>.jsonnet) in the units the parts are built in.
// A table is checked once at load, so a number without a source is a build error rather than a quiet guess.

import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import {
  array,
  type GenericSchema,
  gtValue,
  type InferOutput,
  integer,
  minLength,
  number,
  pipe,
  safeParse,
  strictObject,
  string,
  summarize,
  tuple,
  union,
} from 'valibot';
import ar15Table from '../../../../../../models/guns/tables/ar15.json' with { type: 'json' };
import { GUN_PLATFORMS, type GunPlatforms, SourceSchema } from '../platforms.ts';
import { mmToU } from '../units.ts';

const MeasuredSchema = union([
  strictObject({ mm: number(), source: SourceSchema }),
  strictObject({ mm: pipe(array(tuple([number(), number()])), minLength(3)), source: SourceSchema }),
  strictObject({ kg: pipe(number(), gtValue(0)), source: SourceSchema }),
  strictObject({ count: pipe(number(), integer(), gtValue(0)), source: SourceSchema }),
  strictObject({ deg: number(), source: SourceSchema }),
  strictObject({ rpm: pipe(number(), gtValue(0)), source: SourceSchema }),
]);

const Name = pipe(string(), minLength(1));
const ChoiceSchema = strictObject({ choice: Name, of: Name });
const StandardSchema = strictObject({ standard: Name, mount: Name });

const isGroup = (node: unknown): node is Readonly<Record<string, unknown>> =>
  typeof node === 'object' && node !== null && !Array.isArray(node);

/** The group of the table at a dot path, if there is one. */
const groupAt = (table: unknown, path: string): Readonly<Record<string, unknown>> | undefined => {
  const group = path.split('.').reduce<unknown>((node, key) => (isGroup(node) ? node[key] : undefined), table);
  return isGroup(group) ? group : undefined;
};

/**
 * Where a table holds its picks, by dot path with `*` for any one key, and the group each pick there must name: the
 * families read a pick as a choice of that group, so a pick naming another is wrong even when that group holds it.
 */
type PickGroups = Readonly<Record<string, string>>;

/** The group a pick at `keys` must name, if a pick belongs there. */
const pinnedGroup = (picks: PickGroups, keys: readonly string[]): string | undefined =>
  Object.entries(picks).find(([pattern]) => {
    const segments = pattern.split('.');
    return segments.length === keys.length && segments.every((segment, i) => segment === '*' || segment === keys[i]);
  })?.[1];

/** A leaf parsed by its schema, a failure naming the leaf's place in the table, which valibot alone does not. */
const parseLeaf = <Schema extends GenericSchema>(schema: Schema, node: unknown, path: string): InferOutput<Schema> => {
  const result = safeParse(schema, node);
  if (!result.success) {
    throw new Error(`${path}: ${summarize(result.issues)}`);
  }
  return result.output;
};

interface TableCheck {
  readonly name: string;
  readonly table: unknown;
  readonly picks: PickGroups;
  readonly platforms: GunPlatforms;
}

/**
 * Every leaf of the table is a measurement with its source, a pick among one of the table's own groups of named
 * choices where the table holds picks, or a port standard its mount lists; every other node only groups them. A pick
 * names what it picks from, so a misspelt one is a load error rather than a lookup that fails in whichever family
 * reads it first.
 */
const checkLeaves = (node: unknown, keys: readonly string[], check: TableCheck): void => {
  const path = [check.name, ...keys].join('.');
  if (!isGroup(node)) {
    throw new Error(`${path}: expected a measurement, a choice, a standard or a group of them`);
  }
  if (Object.hasOwn(node, 'source')) {
    parseLeaf(MeasuredSchema, node, path);
    return;
  }
  if (Object.hasOwn(node, 'choice')) {
    const { choice, of } = parseLeaf(ChoiceSchema, node, path);
    const pinned = pinnedGroup(check.picks, keys);
    if (pinned !== of) {
      throw new Error(
        pinned === undefined ? `${path}: no pick belongs here` : `${path}: picks from ${of}, not the ${pinned} it must`,
      );
    }
    if (!Object.hasOwn(groupAt(check.table, of) ?? {}, choice)) {
      throw new Error(`${path}: '${choice}' is not a choice of ${of}`);
    }
    return;
  }
  if (Object.hasOwn(node, 'standard')) {
    const { standard, mount } = parseLeaf(StandardSchema, node, path);
    if (!check.platforms.standards.get(mount)?.has(standard)) {
      throw new Error(`${path}: the ${mount} mount lists no standard '${standard}'`);
    }
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    checkLeaves(child, [...keys, key], check);
  }
};

/** A place a pick pattern names: its keys from the table's root, and what the table holds there, if anything. */
interface Place {
  readonly keys: readonly string[];
  readonly node: unknown;
}

/**
 * The places a pick pattern names under `node`, each `*` standing for every key of the group there. A place whose
 * group is missing is still named, so the pick it should hold is reported missing.
 */
const placesOf = (node: unknown, segments: readonly string[], keys: readonly string[] = []): Place[] => {
  const [segment, ...rest] = segments;
  if (segment === undefined) {
    return [{ keys, node }];
  }
  const group = isGroup(node) ? node : {};
  const children = segment === '*' ? Object.keys(group) : [segment];
  return children.flatMap((key) => placesOf(group[key], rest, [...keys, key]));
};

/**
 * Every place `picks` names holds a pick, so a family reading one finds it there; a pattern that names no place at all
 * is a load error too, since it pins nothing.
 */
const requirePicks = (name: string, table: unknown, picks: PickGroups): void => {
  for (const [pattern, group] of Object.entries(picks)) {
    const places = placesOf(table, pattern.split('.'));
    if (places.length === 0) {
      throw new Error(`${name}.${pattern}: no place holds the pick from ${group} that belongs here`);
    }
    for (const { keys, node } of places) {
      if (!isGroup(node) || !Object.hasOwn(node, 'choice')) {
        throw new Error(`${[name, ...keys].join('.')}: expected a pick from ${group}`);
      }
    }
  }
};

/**
 * A table as loaded, checked leaf by leaf, with a pick at every place `picks` names and nowhere else; `name` heads the
 * path a failure reports.
 */
export const checkFrameTable = <T>(
  name: string,
  raw: T,
  picks: PickGroups,
  platforms: GunPlatforms = GUN_PLATFORMS,
): T => {
  requirePicks(name, raw, picks);
  checkLeaves(raw, [], { name, table: raw, picks, platforms });
  return raw;
};

type Ar15Table = typeof ar15Table;

type Measure = Ar15Table['barrel']['gasPorts']['mid'];
type Buffer = Ar15Table['receiverExtension']['buffers']['rifle'] & {
  readonly castleNut?: Ar15Table['receiverExtension']['buffers']['carbine']['castleNut'];
};

/**
 * A pick of the table: the named choice `choice` among the group at the dot path `Of`. Each frame names its own
 * choices, so the groups are open and `choice` is any name; the load check holds it to a key of its group.
 */
interface TablePick<Of extends string> {
  readonly choice: string;
  readonly of: Of;
}

/** Where every frame table holds its picks, and the group each picks from, which also types each pick. */
export const FRAME_PICKS = {
  'barrel.journal': 'gasBlock.journals',
  'barrel.lengths.*.gas': 'barrel.gasPorts',
  'stock.buffer': 'receiverExtension.buffers',
  'stockA2.buffer': 'receiverExtension.buffers',
} as const satisfies PickGroups;

/** The pick the frame table holds at a pinned path. */
type FramePick<Path extends keyof typeof FRAME_PICKS> = TablePick<(typeof FRAME_PICKS)[Path]>;

type BarrelLength = Omit<Ar15Table['barrel']['lengths']['16-mid'], 'gas'> & {
  readonly gas: FramePick<'barrel.lengths.*.gas'>;
};

/**
 * The shape every frame table shares, read off the AR-15's: the same groups and measurements, with the named choices
 * (gas systems, barrel lengths, journals, front sight base raises, handguard lengths, buffers) and the item masses left
 * open to each frame, and each pick typed by the group it names.
 */
export type ArFrameTable = Omit<
  Ar15Table,
  'barrel' | 'gasBlock' | 'frontSightBase' | 'handguard' | 'receiverExtension' | 'stock' | 'stockA2' | 'masses'
> & {
  readonly barrel: Omit<Ar15Table['barrel'], 'gasPorts' | 'lengths' | 'journal'> & {
    readonly gasPorts: Readonly<Record<string, Measure>>;
    readonly lengths: Readonly<Record<string, BarrelLength>>;
    readonly journal: FramePick<'barrel.journal'>;
  };
  readonly stock: Omit<Ar15Table['stock'], 'buffer'> & { readonly buffer: FramePick<'stock.buffer'> };
  readonly stockA2: Omit<Ar15Table['stockA2'], 'buffer'> & { readonly buffer: FramePick<'stockA2.buffer'> };
  readonly gasBlock: Omit<Ar15Table['gasBlock'], 'journals'> & {
    readonly journals: Readonly<Record<string, Measure>>;
  };
  readonly frontSightBase: Omit<Ar15Table['frontSightBase'], 'raise'> & {
    readonly raise: Readonly<Record<string, Measure>>;
  };
  readonly handguard: Omit<Ar15Table['handguard'], 'lengths'> & {
    readonly lengths: Readonly<Record<string, Ar15Table['handguard']['lengths']['15']>>;
  };
  readonly receiverExtension: Omit<Ar15Table['receiverExtension'], 'buffers'> & {
    readonly buffers: Readonly<Record<string, Buffer>>;
  };
  readonly masses: Readonly<Record<string, Ar15Table['masses']['ar15_lower']>>;
};

/**
 * A frame of the family: its table, the name its families and templates are registered under, and the name a reason
 * calls it by.
 */
export interface ArFrame {
  readonly name: string;
  readonly title: string;
  readonly table: ArFrameTable;
}

/**
 * The pins, each held to the field ArFrameTable types at its path: a pin whose field is missing or typed as a pick from
 * another group becomes `never` here, so FRAME_PICKS no longer passes as the pins a frame table is loaded by.
 */
type FieldPins = {
  readonly [Path in keyof typeof FRAME_PICKS]: [GroupAt<Path>] extends [never]
    ? never
    : [GroupAt<Path>] extends [FramePick<Path>]
      ? (typeof FRAME_PICKS)[Path]
      : never;
};

/**
 * The height a rail's teeth rise from under a rail top at `topY`: the floor of its cross slots, which are drawn
 * `drawnSlotDepth` deep. Both heights are in one unit, so the builder and the table's load check share it.
 */
export const railTeethY = (topY: number, drawnSlotDepth: number): number => topY - drawnSlotDepth;

/** How far apart two heights of the table may be and still be one height, read off the same derivation. */
const SAME_HEIGHT_MM = 1e-6;

/**
 * The rails stand where their builder assumes: the flat-top's teeth alone on a receiver whose top is cut to the drawn
 * slot depth, and the handguard's spine under its teeth rather than over them.
 */
export const checkRailSeats = (name: string, table: ArFrameTable): void => {
  const depth = table.rail.drawnSlotDepth.mm;
  const { upper, handguard } = table;
  const upperTeethY = railTeethY(upper.rail.topY.mm, depth);
  if (Math.abs(upperTeethY - upper.topY.mm) > SAME_HEIGHT_MM) {
    throw new Error(
      `${name}.upper.topY: the flat-top's rail is its teeth alone, so the receiver's top must stand at ` +
        `upper.rail.topY less rail.drawnSlotDepth, ${upperTeethY} mm, not ${upper.topY.mm} mm`,
    );
  }
  const handguardTeethY = railTeethY(handguard.railTopY.mm, depth);
  if (handguard.outerTopY.mm > handguardTeethY) {
    throw new Error(
      `${name}.handguard.outerTopY: the rail's spine runs from the tube's top up to its teeth, so the top must stand ` +
        `no higher than handguard.railTopY less rail.drawnSlotDepth, ${handguardTeethY} mm, ` +
        `not ${handguard.outerTopY.mm} mm`,
    );
  }
};

/**
 * A frame table as loaded. The JSON import types every pick's group as any string; the load check holds each pick to
 * the group its pin names and to a choice of that group, and the pins agree with the fields ArFrameTable types, which
 * is what this cast assumes.
 */
const loadFrameTable = (name: string, raw: unknown, pins: FieldPins): ArFrameTable => {
  const table = checkFrameTable(name, raw, pins) as ArFrameTable;
  checkRailSeats(name, table);
  return table;
};

export const AR15_FRAME: ArFrame = {
  name: 'ar15',
  title: 'AR-15',
  table: loadFrameTable('ar15', ar15Table, FRAME_PICKS),
};

/** The registry name of a frame's family for one role, such as `ar15-lower`. */
export const familyName = (frame: ArFrame, role: string): string => `${frame.name}-${role}`;

/** The named choice `key` of a frame's choices, which the family's params only ever offer from the same keys. */
export const chosen = <T>(choices: Readonly<Record<string, T>>, key: string | undefined): T => {
  const value = key === undefined ? undefined : choices[key];
  if (value === undefined) {
    throw new Error(`no choice '${key}' among ${Object.keys(choices).join(', ')}`);
  }
  return value;
};

/** The type of one child of a node: the named one, or with `*` any child of an open group. */
type ChildOf<Node, Key extends string> = Key extends '*'
  ? Node extends Readonly<Record<string, infer Child>>
    ? Child
    : never
  : Key extends keyof Node
    ? Node[Key]
    : never;

/** The type of the table's node at a dot path, `*` standing for any key of an open group. */
type GroupAt<Path extends string, Node = ArFrameTable> = Path extends `${infer Head}.${infer Rest}`
  ? GroupAt<Rest, ChildOf<Node, Head>>
  : ChildOf<Node, Path>;

/** What a pick among the group at `Of` picks: one of that group's choices. */
type Picked<Of extends string> = GroupAt<Of>[keyof GroupAt<Of>];

/**
 * What a pick of the frame's table picks, read from the group the pick itself names, so the load check that holds the
 * pick to that group guards exactly what the build uses.
 */
export const pick = <Of extends string>(frame: ArFrame, ref: TablePick<Of>): Picked<Of> =>
  // A dot path walked at run time has no type, so its group is cast to the one GroupAt reads off the same path.
  chosen(groupAt(frame.table, ref.of) as Readonly<Record<string, Picked<Of>>>, ref.choice);

/** A length or position of the table in u. */
export const u = (dimension: { readonly mm: number }): number => mmToU(dimension.mm);

/** A traced outline of the table in u. */
export const outlineU = (outline: { readonly mm: readonly (readonly number[])[] }): Vec2[] =>
  outline.mm.map(([x, y]): Vec2 => [mmToU(x!), mmToU(y!)]);
