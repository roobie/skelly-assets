// The frame tables of the modular AR family (models/guns/tables/<frame>.jsonnet) in the units the parts are built in.
// A table is checked once at load, so a number without a source is a build error rather than a quiet guess.

import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import { array, gtValue, minLength, number, parse, pipe, strictObject, tuple, union } from 'valibot';
import ar15Table from '../../../../../../models/guns/tables/ar15.json' with { type: 'json' };
import { SourceSchema } from '../platforms.ts';
import { mmToU } from '../units.ts';

const MeasuredSchema = union([
  strictObject({ mm: number(), source: SourceSchema }),
  strictObject({ mm: pipe(array(tuple([number(), number()])), minLength(3)), source: SourceSchema }),
  strictObject({ kg: pipe(number(), gtValue(0)), source: SourceSchema }),
]);

/** Every leaf of the table is a measurement with its source; every other node only groups them. */
const checkMeasured = (node: unknown, path: string): void => {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    throw new Error(`${path}: expected a measurement or a group of them`);
  }
  if (Object.hasOwn(node, 'source')) {
    parse(MeasuredSchema, node);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    checkMeasured(child, `${path}.${key}`);
  }
};

/** A table as loaded, checked that every leaf is sourced; `name` heads the path a failure reports. */
const checkFrameTable = <T>(name: string, raw: T): T => {
  checkMeasured(raw, name);
  return raw;
};

type Ar15Table = typeof ar15Table;

/**
 * The shape every frame table shares, read off the AR-15's: the same groups and measurements, with the named choices
 * (barrel lengths, handguard lengths) and the item masses left open to each frame.
 */
export type ArFrameTable = Omit<Ar15Table, 'barrel' | 'handguard' | 'masses'> & {
  readonly barrel: Omit<Ar15Table['barrel'], 'lengths'> & {
    readonly lengths: Readonly<Record<string, Ar15Table['barrel']['lengths']['16-mid']>>;
  };
  readonly handguard: Omit<Ar15Table['handguard'], 'lengths'> & {
    readonly lengths: Readonly<Record<string, Ar15Table['handguard']['lengths']['15']>>;
  };
  readonly masses: Readonly<Record<string, Ar15Table['masses']['ar15_lower']>>;
};

/** A frame of the family: its table, and the name its families and template are registered under. */
export interface ArFrame {
  readonly name: string;
  readonly table: ArFrameTable;
}

export const AR15_FRAME: ArFrame = { name: 'ar15', table: checkFrameTable('ar15', ar15Table) };

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

/** A length or position of the table in u. */
export const u = (dimension: { readonly mm: number }): number => mmToU(dimension.mm);

/** A traced outline of the table in u. */
export const outlineU = (outline: { readonly mm: readonly (readonly number[])[] }): Vec2[] =>
  outline.mm.map(([x, y]): Vec2 => [mmToU(x!), mmToU(y!)]);
