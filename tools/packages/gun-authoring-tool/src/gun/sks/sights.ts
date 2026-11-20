import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import type { GunPartFamily } from '../actionRoles.ts';
import { box, X } from '../antiMateriel/common.ts';
import { sightAxis } from '../sightAxis.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';
import { TOO_SMALL_TO_VOXELIZE } from '../tooSmallToVoxelize.ts';
import { mountPort } from './joints.ts';
import { block } from './shapes.ts';

const mid = ([low, high]: readonly [number, number]): number => (low + high) / 2;

/**
 * The post inside its hood on the front sight base, seen from the eye over the stock's comb. It is drawn smooth, since
 * its post is thinner than a voxel.
 */
export const sksFrontSight: GunPartFamily = {
  name: 'sks-front-sight',
  params: {},
  build(): PartDef {
    const { post, hood } = P.frontSight;
    const [inner, outer] = hood.wallZ;
    const postX = mid(post.x);
    return {
      family: 'front-sight',
      solids: [
        block('post', post),
        box('hood-left', [hood.x[0], hood.y[0], -outer], [hood.x[1], hood.y[1], -inner]),
        box('hood-right', [hood.x[0], hood.y[0], inner], [hood.x[1], hood.y[1], outer]),
        box('hood-roof', [hood.x[0], hood.y[1] - hood.roofU, -inner], [hood.x[1], hood.y[1], inner]),
      ],
      ports: [mountPort('front-sight')],
      keepOuts: [],
      axes: [sightAxis('front', { origin: [postX, post.y[1], 0], dir: X, referenceDistanceU: postX - P.stock.combX })],
      tags: TOO_SMALL_TO_VOXELIZE,
    };
  },
};

/** The notch's shoulders keep square edges: the eye sits on their tops, which a bevel would round away below it. */
const SHARP_NOTCH = { bevel: false } as const;

/**
 * The tangent sight on the receiver's front roof: its base, the leaf lying back along it, and the notch block at the
 * leaf's rear, open across the sight line. The eye sits over the stock's comb. It is drawn smooth, since the notch is
 * narrower than a voxel.
 */
export const sksRearSight: GunPartFamily = {
  name: 'sks-rear-sight',
  params: {},
  build(): PartDef {
    const { base, leaf, leafHalfWidthU, notch } = P.rearSight;
    const notchX = mid(notch.x);
    return {
      family: 'rear-sight',
      solids: [
        block('base', base),
        { id: 'leaf-base', kind: 'extruded-polygon', profile: leaf, z: [-leafHalfWidthU, leafHalfWidthU] },
        {
          ...box('leaf-left', [notch.x[0], notch.y[0], -leafHalfWidthU], [notch.x[1], notch.y[1], -notch.gapHalfU]),
          display: SHARP_NOTCH,
        },
        {
          ...box('leaf-right', [notch.x[0], notch.y[0], notch.gapHalfU], [notch.x[1], notch.y[1], leafHalfWidthU]),
          display: SHARP_NOTCH,
        },
      ],
      ports: [mountPort('rear-sight')],
      keepOuts: [],
      axes: [
        sightAxis('rear', {
          origin: [notchX, notch.y[1], 0],
          dir: X,
          referenceDistanceU: notchX - P.stock.combX,
        }),
      ],
      tags: TOO_SMALL_TO_VOXELIZE,
    };
  },
};
