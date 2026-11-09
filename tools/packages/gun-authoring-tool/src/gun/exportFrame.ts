// Keep firearm units and file axes in the Gungen adapter so the construct package stays domain-neutral.

import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import {
  compose,
  eulerXyzDegrees,
  type Mat3,
  mulMM,
  mulMV,
  rotation,
  transpose,
  type Vec3,
} from '@skelly/construct/foundation/math.ts';
import { type Forward, FRONT_TURNS } from '@skelly/thing-core/frame';
import unitScale from './unitScale.json' with { type: 'json' };

/**
 * The scale is anchored to a sourced STANAG magazine dimension; the export applies the resolved
 * domain's `units.metresPerUnit`.
 */
export const METRES_PER_UNIT = unitScale.metresPerUnit;

/**
 * The axis gungen lays a gun's front on. Its frame is right-handed with +X forward (the bore), +Y up and +Z right,
 * because the authored measures read along the bore.
 */
const GUNGEN_FORWARD: Forward = '+x';

/**
 * How gungen assembly axes map to the exported file's axes: `file = FILE_FROM_GUNGEN * gungen`.
 *
 * Every model file faces glTF's +z (see docs/decisions/0002-model-frame.md), so the export turns gungen's front onto
 * it, once, by the turn every source laid out along +x takes.
 */
export const FILE_FROM_GUNGEN: Mat3 = FRONT_TURNS[GUNGEN_FORWARD];

/** The held axes put the working end where a model file puts its front, so gungen's bore takes the same turn. */
const HELD_FROM_GUNGEN: Mat3 = FRONT_TURNS[GUNGEN_FORWARD];

/** Applies `FILE_FROM_GUNGEN` to a point or direction. */
export const toFileAxes = (v: Vec3, mapping: Mat3 = FILE_FROM_GUNGEN): Vec3 => mulMV(mapping, v);

/** A gungen-frame rotation, such as a part's placement, as the same rotation of the file's axes. */
export const toFileRotation = (r: Mat3): Mat3 => mulMM(FILE_FROM_GUNGEN, mulMM(r, transpose(FILE_FROM_GUNGEN)));

const fileAxisOf = (gungenAxis: 0 | 1 | 2): 0 | 1 | 2 =>
  ([0, 1, 2] as const).find((axis) => FILE_FROM_GUNGEN[axis * 3 + gungenAxis] !== 0)!;

/**
 * The file's coordinate index along gungen's bore, up and side axes, for code that reads the written file back. The
 * bore and up keep their sign, as the turn carries the front onto +z; the side's may flip, so it indexes only spans.
 */
export const FILE_AXES = { bore: fileAxisOf(0), up: fileAxisOf(1), side: fileAxisOf(2) } as const;

/** The file-frame point with these coordinates along the file's bore, up and side axes. */
export const fileVector = (coordinates: Readonly<Record<keyof typeof FILE_AXES, number>>): Vec3 => {
  const point: [number, number, number] = [0, 0, 0];
  for (const name of ['bore', 'up', 'side'] as const) {
    point[FILE_AXES[name]] = coordinates[name];
  }
  return point;
};

/**
 * The assembly with every part placed in the file's axes, as the writer draws it. Datums read off placements, such as
 * collision boxes and drawn points, take it so they share the file's frame without a turn of their own.
 */
export const inFileFrame = (resolved: Resolved): Resolved => ({
  ...resolved,
  placed: new Map(
    [...resolved.placed].map(([id, placed]) => [id, compose(rotation(FILE_FROM_GUNGEN), placed)] as const),
  ),
});

/**
 * Held-model `grip.turn` for a model written with `fileFromGungen`: the fixed rotation that carries the
 * exported file's axes onto the held axes (working end +Z, up +Y). The default export already lies on them, so its
 * turn is none.
 *
 * The grip transform maps the exported file onto the held-model axes; it is not the hold frame's orientation.
 * A grip may be raked and its hold frame may lean, but `turn` carries only the model file's orientation. The
 * tilted frame stays in gun anchor data for hand posing, so this function takes no anchor.
 */
export const gripTurn = (fileFromGungen: Mat3 = FILE_FROM_GUNGEN): Vec3 =>
  eulerXyzDegrees(mulMM(HELD_FROM_GUNGEN, transpose(fileFromGungen)));
