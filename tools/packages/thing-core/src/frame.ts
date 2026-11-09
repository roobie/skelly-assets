// Every model file is written in glTF's frame; see docs/decisions/0002-model-frame.md. A source laid out with its
// front on another axis names that axis, and its build turns it here, once, so no consumer converts axes.
import {
  eulerXyzDegrees,
  fromEulerXyzDegrees,
  type Mat3,
  mulMM,
  mulMV,
  transpose,
  type Vec3,
} from '@skelly/construct/foundation/math.ts';

/** The axes a source can put its front on; a source that names none is already laid out with its front on +z. */
export const FORWARDS = ['+z', '+x', '-x', '-z'] as const;
export type Forward = (typeof FORWARDS)[number];

/** The turn about +y that carries a source's front onto +z. Exact, so a turned file carries no rounding noise. */
export const FRONT_TURNS: Readonly<Record<Forward, Mat3>> = {
  '+z': [1, 0, 0, 0, 1, 0, 0, 0, 1],
  '+x': [0, 0, -1, 0, 1, 0, 1, 0, 0],
  '-x': [0, 0, 1, 0, 1, 0, -1, 0, 0],
  '-z': [-1, 0, 0, 0, 1, 0, 0, 0, -1],
};

/** A point or direction of a source laid out with its front on `forward`, in the model frame. */
export const toModelFrame = (forward: Forward, v: Vec3): Vec3 => mulMV(FRONT_TURNS[forward], v);

/**
 * A held model's grip turn in the file, from the one its source gives. A source's turn carries the source's own axes
 * onto the held axes, whose working end lies where the source's front does, so turning the source turns its grip turn
 * with it: the file's carries the file's axes onto the held axes, working end +z.
 */
export const fileGripTurn = (forward: Forward, turn: Vec3): Vec3 => {
  const front = FRONT_TURNS[forward];
  return eulerXyzDegrees(mulMM(front, mulMM(fromEulerXyzDegrees(turn), transpose(front))));
};
