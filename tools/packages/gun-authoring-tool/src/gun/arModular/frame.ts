// The AR-15 frame table (models/guns/tables/ar15.jsonnet) in the units the parts are built in. The table is checked
// once at load, so a number without a source is a build error rather than a quiet guess.

import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import { array, gtValue, minLength, number, parse, pipe, strictObject, tuple, union } from 'valibot';
import table from '../../../../../../models/guns/tables/ar15.json' with { type: 'json' };
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

const checked = <T>(raw: T): T => {
  checkMeasured(raw, 'ar15');
  return raw;
};

export const AR15 = checked(table);

/** A length or position of the table in u. */
export const u = (dimension: { readonly mm: number }): number => mmToU(dimension.mm);

/** A traced outline of the table in u. */
export const outlineU = (outline: { readonly mm: readonly (readonly number[])[] }): Vec2[] =>
  outline.mm.map(([x, y]): Vec2 => [mmToU(x!), mmToU(y!)]);
