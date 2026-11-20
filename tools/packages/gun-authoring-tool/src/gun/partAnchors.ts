// Anchor frames read off a built part, shared by the anchor declarations of every family: a leaf, so the part folders
// that parts.ts imports can declare their own anchors.

import type { AnchorFrame } from '@skelly/construct/assembly/anchors.ts';
import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import { add, extrusionPoint, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { boundsOfPoints, localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import type { RevolvedSolid, Solid } from '@skelly/construct/shapes/solid.ts';
import type { GunPartAnchors } from './anchors.ts';
import { localEjectionPoint } from './ejection.ts';

export const X: Vec3 = [1, 0, 0];
export const Y: Vec3 = [0, 1, 0];

export const findSolid = (part: PartDef, ...ids: string[]): Solid | undefined =>
  ids.map((id) => part.solids.find((s) => s.id === id)).find((s) => s !== undefined);

/** A revolved solid's interior point: on its axis, midway along it. */
export const axisMidpoint = (s: RevolvedSolid): Vec3 => {
  const axial = s.profile.map((p) => p[0]);
  return add(s.origin ?? [0, 0, 0], extrusionPoint(s.axis, [0, 0], (Math.min(...axial) + Math.max(...axial)) / 2));
};

/** A point inside a convex solid: box centre, the axis midpoint of a revolved one, or the vertex mean of a convex profile at mid-extrusion. */
export const interiorPoint = (s: Solid): Vec3 => {
  if (s.kind === 'box') {
    return s.box.center;
  }
  if (s.kind === 'revolved') {
    return axisMidpoint(s);
  }
  const n = s.profile.length;
  return extrusionPoint(
    s.axis,
    [s.profile.reduce((sum, p) => sum + p[0], 0) / n, s.profile.reduce((sum, p) => sum + p[1], 0) / n],
    (s.z[0] + s.z[1]) / 2,
  );
};

export const frameAt = (position: Vec3, forward: Vec3 = X, up: Vec3 = Y): AnchorFrame => ({ position, forward, up });

/** A barrel's or muzzle device's muzzle: its `muzzle` port, facing out of the bore. */
export const muzzlePortAnchor = (_params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
  const muzzle = part.ports.find((port) => port.id === 'muzzle');
  return muzzle ? { muzzle: frameAt(muzzle.pos, muzzle.normal, muzzle.up) } : {};
};

/** A lower's magazine well: its `magazine` port. */
export const magwellAnchor = (_params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
  const magazine = part.ports.find((port) => port.id === 'magazine');
  return magazine ? { magwell: frameAt(magazine.pos) } : {};
};

export const ejectionAnchor = (_params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
  const point = localEjectionPoint(part);
  return point ? { ejection: frameAt(point) } : {};
};

/** The firing hand on a grip's body; `axes` are the grip's own forward and up. */
export const gripHold =
  (bodyIds: readonly string[], axes: (part: PartDef) => Pick<AnchorFrame, 'forward' | 'up'>) =>
  (_params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
    const body = findSolid(part, ...bodyIds);
    return body ? { hold: { position: interiorPoint(body), ...axes(part) } } : {};
  };

/** Centre of a solid's underside, at `along` (0..1) of its length: where the support hand cups a fore-end. */
export const undersideSupport = (part: PartDef, along: number): GunPartAnchors => {
  const under = findSolid(part, 'bottom', 'shell-3');
  if (under?.kind === 'box') {
    const { center, half } = under.box;
    return { support: frameAt([center[0] - half[0] + 2 * half[0] * along, center[1], 0]) };
  }
  if (under?.kind === 'extruded-polygon' && under.axis === 'x') {
    const bottomY = Math.min(...under.profile.map(([y]) => y));
    const bottomEdge = under.profile.filter(([y]) => Math.abs(y - bottomY) <= 1e-6);
    const bottomZ = bottomEdge.reduce((sum, [, z]) => sum + z, 0) / bottomEdge.length;
    const x = under.z[0] + (under.z[1] - under.z[0]) * along;
    return { support: frameAt(extrusionPoint('x', [bottomY, bottomZ], x)) };
  }
  return {};
};

/**
 * Middle of a tube's underside, `fromRear` part units ahead of its rear end: where the support hand cups a fore-end
 * drawn as the walls of one tube (`octagonalTubeWalls`), whose underside no single solid holds.
 */
export const tubeUndersideSupport = (part: PartDef, tube: string, fromRear: number): GunPartAnchors => {
  const walls = part.solids.filter(({ id }) => id.startsWith(`${tube}-wall-`));
  if (walls.length === 0) {
    return {};
  }
  const [min, max] = boundsOfPoints(walls.flatMap(localSolidBounds));
  return { support: frameAt([min[0] + fromRear, min[1], (min[2] + max[2]) / 2]) };
};

/**
 * Middle of a stock's rear face, where the shoulder takes it: the height and width centre of the solids reaching the
 * stock's rearmost point, at that point. A raked pad steps forward from its heel, so the export moves it onto the
 * drawn face.
 */
export const rearFaceButt = (part: PartDef): GunPartAnchors => {
  const bounds = part.solids.map(localSolidBounds);
  const rear = Math.min(...bounds.map(([min]) => min[0]));
  const [min, max] = boundsOfPoints(bounds.filter(([low]) => low[0] - rear < 1e-6).flat());
  return { butt: frameAt([rear, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]) };
};
