import { Matrix4 } from 'three';

/** A rigid transform as the matrix that carries a point the same way. */
export const matrixOf = (t: { readonly r: readonly number[]; readonly t: readonly number[] }): Matrix4 =>
  new Matrix4().set(
    t.r[0]!,
    t.r[1]!,
    t.r[2]!,
    t.t[0]!,
    t.r[3]!,
    t.r[4]!,
    t.r[5]!,
    t.t[1]!,
    t.r[6]!,
    t.r[7]!,
    t.r[8]!,
    t.t[2]!,
    0,
    0,
    0,
    1,
  );
