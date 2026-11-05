// The extra features a mob row adds to a template's body (Template.parts): signature parts such as claws, a torn chest or glowing eyes, written
// against bones so they follow the body's proportions. See PartSpec in core/template.ts.

import type { Body, Feature } from '../core/body.ts';
import { add, type Vec3 } from '../core/math.ts';
import type { PartShape, PartSpec } from '../core/template.ts';

const OTHER_SIDE: Readonly<Record<string, string>> = { L: 'R', R: 'L' };

const shift = (shape: PartShape, by: Vec3, flipX: boolean): Feature['shape'] => {
  const at = (p: readonly [number, number, number]): Vec3 => add(by, flipX ? [-p[0], p[1], p[2]] : [p[0], p[1], p[2]]);
  switch (shape.kind) {
    case 'ellipsoid':
      return { kind: 'ellipsoid', center: at(shape.center), radii: [...shape.radii] };
    case 'box':
      return { kind: 'box', center: at(shape.center), half: [...shape.half], round: shape.round ?? 0 };
    case 'capsule':
      return { kind: 'capsule', a: at(shape.a), b: at(shape.b), ra: shape.ra, rb: shape.rb };
  }
};

/** `parts` as features of `bones` (the body's rest skeleton): each part's points are offsets from its bone's head, tail or midpoint. */
export const partFeatures = (parts: readonly PartSpec[], bones: Body['bones']): Feature[] => {
  const features: Feature[] = [];
  const place = (part: PartSpec, boneId: string, flipX: boolean) => {
    const bone = bones.find((b) => b.id === boneId);
    if (!bone) {
      throw new Error(`part on unknown bone "${boneId}"`);
    }
    const where = part.at ?? 'head';
    const anchor: Vec3 =
      where === 'head'
        ? bone.head
        : where === 'tail'
          ? bone.tail
          : [(bone.head[0] + bone.tail[0]) / 2, (bone.head[1] + bone.tail[1]) / 2, (bone.head[2] + bone.tail[2]) / 2];
    features.push({
      bone: boneId,
      op: part.op ?? 'add',
      shape: shift(part.shape, anchor, flipX),
      material: part.material,
      ...(part.blend !== undefined ? { blend: part.blend } : {}),
      ...(part.onto !== undefined ? { onto: part.onto } : {}),
    });
  };
  for (const part of parts) {
    place(part, part.bone, false);
    if (part.mirror) {
      const m = /^(.*)\.([LR])$/.exec(part.bone);
      if (!m) {
        throw new Error(`mirrored part on "${part.bone}", which has no side`);
      }
      place(part, `${m[1]}.${OTHER_SIDE[m[2]!]}`, true);
    }
  }
  return features;
};
