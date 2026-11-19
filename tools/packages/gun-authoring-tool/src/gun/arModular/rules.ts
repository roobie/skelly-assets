// The couplings between a frame's modules that a port alone cannot state, each refused with the reason a builder would
// give. They follow gun/rules.ts: judge only placed parts, report readable issues.

import type { Resolved, ResolvedConnection, Rule } from '@skelly/construct/assembly/schema.ts';
import type { Issue } from '@skelly/construct/foundation/issue.ts';
import { applyDir, applyPoint, dot, sub } from '@skelly/construct/foundation/math.ts';
import { localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import { X } from '../antiMateriel/common.ts';
import { type SightRole, sightAxisOf, sightRoleOf } from '../sightAxis.ts';
import { uToMm } from '../units.ts';
import { barrelGas } from './barrel.ts';
import { type ArFrame, familyName, u } from './frame.ts';

const EPSILON = 1e-6;

/** The placed parts of a registered family. */
const placedOf = (r: Resolved, family: string): string[] =>
  Object.entries(r.assembly.parts)
    .filter(([part, instance]) => instance.family === family && r.placed.has(part))
    .map(([part]) => part);

/** The value a part was built with for one of its params. */
const paramOf = (r: Resolved, part: string, param: string): string | undefined => r.params.get(part)?.[param]?.value;

/** The end of a resolved connection on the named part, and the other end. */
const endsOf = (rc: ResolvedConnection, part: string) =>
  rc.from.part === part
    ? { own: rc.from, other: rc.to }
    : rc.to.part === part
      ? { own: rc.to, other: rc.from }
      : undefined;

const issue = (rule: string, message: string, parts: string[]): Issue => ({ rule, message, parts });

/** A drop-in handguard spans from the upper to the front sight base over one gas port, so only that one fits. */
const dropInGas = (frame: ArFrame): Rule => {
  const id = `${frame.name}-drop-in-gas`;
  return {
    id,
    title: 'The drop-in handguard is made for the barrel gas system',
    check: (r) =>
      placedOf(r, familyName(frame, 'handguard-drop-in')).flatMap((handguard) =>
        placedOf(r, familyName(frame, 'barrel')).flatMap((barrel) => {
          const gas = paramOf(r, handguard, 'gas');
          const length = paramOf(r, barrel, 'length');
          const barrelGasName = length === undefined ? undefined : barrelGas(frame, length);
          return gas === barrelGasName || barrelGasName === undefined
            ? []
            : [
                issue(
                  id,
                  `${gas}-length drop-in handguard does not fit a ${barrelGasName}-length gas system; use the ${barrelGasName}-length drop-in`,
                  [handguard, barrel],
                ),
              ];
        }),
      ),
  };
};

/** A drop-in handguard has nothing but the front sight base's cap to hold its front. */
const dropInCap = (frame: ArFrame): Rule => {
  const id = `${frame.name}-drop-in-cap`;
  return {
    id,
    title: 'A front sight base holds the drop-in handguard',
    check: (r) =>
      placedOf(r, familyName(frame, 'handguard-drop-in'))
        .filter((handguard) => !r.connections.some((rc) => endsOf(rc, handguard)?.own.port.id === 'handguard-cap'))
        .map((handguard) =>
          issue(
            id,
            'drop-in handguard needs a front sight base to hold its front; a low-profile gas block has no handguard cap',
            [handguard],
          ),
        ),
  };
};

/** A free-float handguard must stop short of a front sight base, which stands round the barrel ahead of the upper. */
const freeFloatPastBase = (frame: ArFrame): Rule => {
  const id = `${frame.name}-free-float-sight-base`;
  return {
    id,
    title: 'A free-float handguard stops short of the front sight base',
    check: (r) =>
      placedOf(r, familyName(frame, 'handguard')).flatMap((handguard) =>
        placedOf(r, familyName(frame, 'front-sight-base')).flatMap((base) => {
          const handguardDef = r.defs.get(handguard)!;
          const cap = r.defs.get(base)!.ports.find((port) => port.id === 'handguard-cap');
          if (!cap) {
            return [];
          }
          const transform = r.placed.get(handguard)!;
          const length = Math.max(...handguardDef.solids.map((solid) => localSolidBounds(solid)[1][0]));
          const baseRear = dot(sub(applyPoint(r.placed.get(base)!, cap.pos), transform.t), applyDir(transform, X));
          return length > baseRear + EPSILON
            ? [
                issue(
                  id,
                  `free-float handguard (${uToMm(length).toFixed(0)} mm) runs past the front sight base at ${uToMm(baseRear).toFixed(0)} mm; fit a low-profile gas block`,
                  [handguard, base],
                ),
              ]
            : [];
        }),
      ),
  };
};

/** The carry handle stands where the flat-top's rail would, so nothing can be slotted on top. */
const carryHandleRail = (frame: ArFrame): Rule => {
  const id = `${frame.name}-carry-handle-rail`;
  return {
    id,
    title: 'Nothing mounts on the carry-handle upper top rail',
    check: (r) =>
      placedOf(r, familyName(frame, 'upper'))
        .filter((upper) => paramOf(r, upper, 'top') === 'carry-handle')
        .flatMap((upper) =>
          r.assembly.connections.flatMap((connection) => {
            const ends = [connection.from, connection.to];
            const other = ends.find((end) => end !== `${upper}.rail`);
            return ends.includes(`${upper}.rail`) && other !== undefined
              ? [
                  issue(id, `the carry-handle upper has no top rail: ${other.split('.')[0]} needs the flat-top upper`, [
                    upper,
                  ]),
                ]
              : [];
          }),
        ),
  };
};

/** The placed parts whose sight serves in one of the given roles. */
const placedSights = (r: Resolved, roles: readonly SightRole[]): string[] =>
  [...r.defs]
    .filter(([part, def]) => {
      const role = sightRoleOf(def);
      return r.placed.has(part) && role !== undefined && roles.includes(role);
    })
    .map(([part]) => part);

/** The height over the bore, in the gun's frame, of a placed part's sight line. */
const sightLineY = (r: Resolved, part: string): number =>
  applyPoint(r.placed.get(part)!, sightAxisOf(r.defs.get(part)!)!.origin)[1];

/**
 * The front post must stand on the rear sight's line: a carry handle's aperture is lower than a flat-top's rail rear
 * sight's, and each front sight base is made for one of them. An optic aims on its own line, so only iron rear sights
 * are judged.
 */
const sightHeight = (frame: ArFrame): Rule => {
  const id = `${frame.name}-sight-height`;
  const tolerance = u(frame.table.sightLine.tolerance);
  return {
    id,
    title: 'The front sight base stands at the rear sight height',
    check: (r) =>
      placedOf(r, familyName(frame, 'front-sight-base')).flatMap((base) =>
        placedSights(r, ['rear']).flatMap((rear) => {
          const off = sightLineY(r, base) - sightLineY(r, rear);
          return Math.abs(off) <= tolerance
            ? []
            : [
                issue(
                  id,
                  `${paramOf(r, base, 'height')} front sight base does not match the rear sight on ${rear}: its post stands ${uToMm(Math.abs(off)).toFixed(2)} mm ${off > 0 ? 'above' : 'below'} the sight line`,
                  [base, rear],
                ),
              ];
        }),
      ),
  };
};

/** A front post alone cannot be aimed with: the eye needs a rear sight or an optic to line it up through. */
const rearSightPresent = (frame: ArFrame): Rule => {
  const id = `${frame.name}-rear-sight`;
  return {
    id,
    title: 'A front sight base has a rear sight',
    check: (r) =>
      placedSights(r, ['rear', 'optic']).length > 0
        ? []
        : placedOf(r, familyName(frame, 'front-sight-base')).map((base) =>
            issue(id, 'front sight base without a rear sight: add a rail rear sight or an optic', [base]),
          ),
  };
};

/** The coupling rules of a frame's modules. */
export const arModularRules = (frame: ArFrame): Rule[] => [
  dropInGas(frame),
  dropInCap(frame),
  freeFloatPastBase(frame),
  carryHandleRail(frame),
  sightHeight(frame),
  rearSightPresent(frame),
];
