// The frame tables of the modular AR family (models/guns/tables/<frame>.jsonnet) in the units the parts are built in.
// A table is checked once at load, so a number without a source is a build error rather than a quiet guess.

import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import { array, gtValue, minLength, number, parse, pipe, strictObject, string, tuple, union } from 'valibot';
import ar15Table from '../../../../../../models/guns/tables/ar15.json' with { type: 'json' };
import { GUN_PLATFORMS, type GunPlatforms, SourceSchema } from '../platforms.ts';
import { mmToU } from '../units.ts';

const MeasuredSchema = union([
  strictObject({ mm: number(), source: SourceSchema }),
  strictObject({ mm: pipe(array(tuple([number(), number()])), minLength(3)), source: SourceSchema }),
  strictObject({ kg: pipe(number(), gtValue(0)), source: SourceSchema }),
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
 * Every leaf of the table is a measurement with its source, a pick among one of the table's own groups of named
 * choices, or a port standard its mount lists; every other node only groups them. A pick names what it picks from, so
 * a misspelt one is a load error rather than a lookup that fails in whichever family reads it first.
 */
const checkLeaves = (node: unknown, path: string, table: unknown, platforms: GunPlatforms): void => {
  if (!isGroup(node)) {
    throw new Error(`${path}: expected a measurement, a choice, a standard or a group of them`);
  }
  if (Object.hasOwn(node, 'source')) {
    parse(MeasuredSchema, node);
    return;
  }
  if (Object.hasOwn(node, 'choice')) {
    const { choice, of } = parse(ChoiceSchema, node);
    if (!Object.hasOwn(groupAt(table, of) ?? {}, choice)) {
      throw new Error(`${path}: '${choice}' is not a choice of ${of}`);
    }
    return;
  }
  if (Object.hasOwn(node, 'standard')) {
    const { standard, mount } = parse(StandardSchema, node);
    if (!platforms.standards.get(mount)?.has(standard)) {
      throw new Error(`${path}: the ${mount} mount lists no standard '${standard}'`);
    }
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    checkLeaves(child, `${path}.${key}`, table, platforms);
  }
};

/** A table as loaded, checked leaf by leaf; `name` heads the path a failure reports. */
export const checkFrameTable = <T>(name: string, raw: T, platforms: GunPlatforms = GUN_PLATFORMS): T => {
  checkLeaves(raw, name, raw, platforms);
  return raw;
};

type Ar15Table = typeof ar15Table;

type Measure = Ar15Table['barrel']['gasPorts']['mid'];
type Buffer = Ar15Table['receiverExtension']['buffers']['rifle'] & {
  readonly castleNut?: Ar15Table['receiverExtension']['buffers']['carbine']['castleNut'];
};

/** A pick of the table: the named choice `choice` among the group at the dot path `Of`. */
interface TablePick<Of extends string> {
  readonly choice: string;
  readonly of: Of;
}

type BarrelLength = Omit<Ar15Table['barrel']['lengths']['16-mid'], 'gas'> & {
  readonly gas: TablePick<'barrel.gasPorts'>;
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
    readonly journal: TablePick<'gasBlock.journals'>;
  };
  readonly stock: Omit<Ar15Table['stock'], 'buffer'> & { readonly buffer: TablePick<'receiverExtension.buffers'> };
  readonly stockA2: Omit<Ar15Table['stockA2'], 'buffer'> & { readonly buffer: TablePick<'receiverExtension.buffers'> };
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

// The load check holds each pick to a choice of the group its path names, which is the group `pick` reads, so a pick is
// typed by the group at its path.
export const AR15_FRAME: ArFrame = {
  name: 'ar15',
  title: 'AR-15',
  table: checkFrameTable('ar15', ar15Table) as ArFrameTable,
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

/** The type of the table's node at a dot path. */
type GroupAt<Path extends string, Node = ArFrameTable> = Path extends `${infer Head}.${infer Rest}`
  ? Head extends keyof Node
    ? GroupAt<Rest, Node[Head]>
    : never
  : Path extends keyof Node
    ? Node[Path]
    : never;

/** What a pick among the group at `Of` picks: one of that group's choices. */
type Picked<Of extends string> = GroupAt<Of>[keyof GroupAt<Of>];

/**
 * What a pick of the frame's table picks, read from the group the pick itself names, so the load check that holds the
 * pick to that group guards exactly what the build uses.
 */
export const pick = <Of extends string>(frame: ArFrame, ref: TablePick<Of>): Picked<Of> =>
  chosen(groupAt(frame.table, ref.of) as Readonly<Record<string, Picked<Of>>>, ref.choice);

/** A length or position of the table in u. */
export const u = (dimension: { readonly mm: number }): number => mmToU(dimension.mm);

/** A traced outline of the table in u. */
export const outlineU = (outline: { readonly mm: readonly (readonly number[])[] }): Vec2[] =>
  outline.mm.map(([x, y]): Vec2 => [mmToU(x!), mmToU(y!)]);
