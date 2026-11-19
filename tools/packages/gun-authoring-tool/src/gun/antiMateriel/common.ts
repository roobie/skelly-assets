// Shared helpers for the anti-materiel families (muzzle brake, barrel shroud, bipod, carry handle, recoil
// stock, monopod). They import only from core: parts.ts registers these families, so importing parts.ts
// from here would make a cycle. Numbers are in u and sit on the 0.25u grid unless a comment says otherwise.

import type { ParamSpec } from '@skelly/construct/assembly/schema.ts';
import { SIZE_CLASSES, type SizeClass } from '@skelly/construct/foundation/conventions.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { BoxSolid, SolidDisplayHints, SolidFinish } from '@skelly/construct/shapes/solid.ts';
import physical from '../../../../../../models/guns/tables/physical.json' with { type: 'json' };

export const X: Vec3 = [1, 0, 0];
export const NEG_X: Vec3 = [-1, 0, 0];
export const Y: Vec3 = [0, 1, 0];
export const NEG_Y: Vec3 = [0, -1, 0];
export const Z: Vec3 = [0, 0, 1];
export const NEG_Z: Vec3 = [0, 0, -1];

export const sizeParam: ParamSpec = { values: SIZE_CLASSES, default: 'M' };
export const choice = (...values: string[]): ParamSpec => ({ values, default: values[0]! });
export const cls = (params: Readonly<Record<string, string>>, name: string): SizeClass => params[name] as SizeClass;

export const box = (
  id: string,
  min: Vec3,
  max: Vec3,
  extra: SolidFinish & { readonly display?: SolidDisplayHints } = {},
): BoxSolid => ({
  id,
  kind: 'box',
  box: boxFromMinMax(min, max),
  ...extra,
});

/** Solid black rubber, shared by recoil pads and the dark perforation panels. */
export const RUBBER: SolidFinish = physical.solidFinishes.rubber;
