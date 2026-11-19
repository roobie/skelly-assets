// The couplings between a frame's modules that a port alone cannot state, each refused with the reason a builder would
// give. They follow gun/rules.ts: judge only placed parts, report readable issues.

import type { Resolved, ResolvedConnection, Rule } from '@skelly/construct/assembly/schema.ts';
import type { Issue } from '@skelly/construct/foundation/issue.ts';
import { applyDir, applyPoint, dot, sub } from '@skelly/construct/foundation/math.ts';
import { localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import { X } from '../antiMateriel/common.ts';
import { MAGAZINE_FRAME_WELLS } from '../magazineProfiles.ts';
import { GUN_PLATFORMS } from '../platforms.ts';
import { mmToInches, uToMm } from '../units.ts';
import { barrelGas } from './barrel.ts';
import { type ArFrame, familyName } from './frame.ts';
import { stockBuffer } from './stock.ts';
import { sightHeightExtraMm, sightHeightStandard } from './upper.ts';

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

/** The barrel's gas port is turned to one journal, and a block bored for another slides loose on it. */
const gasJournal = (frame: ArFrame): Rule => {
  const id = `${frame.name}-gas-journal`;
  return {
    id,
    title: 'The gas block is bored for the barrel journal',
    check: (r) =>
      placedOf(r, familyName(frame, 'barrel')).flatMap((barrel) =>
        r.connections.flatMap((rc) => {
          const ends = endsOf(rc, barrel);
          if (ends?.own.port.mount !== 'gas-block' || ends.own.port.standard === ends.other.port.standard) {
            return [];
          }
          const journal = GUN_PLATFORMS.standards.get('gas-block')?.get(ends.own.port.standard ?? '')
            ?.dimensions.journalDiameter;
          const size = journal ? `${mmToInches(journal.mm).toFixed(3)}"` : 'unstated';
          return [
            issue(id, `gas block does not fit the ${size} gas journal of the ${barrel}`, [ends.other.part, barrel]),
          ];
        }),
      ),
  };
};

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

/** The placed parts other than `except` that a shooter can aim through. */
const sightsBesides = (r: Resolved, except: string): string[] =>
  [...r.defs]
    .filter(([part, def]) => part !== except && r.placed.has(part) && def.axes.some((axis) => axis.kind === 'sight'))
    .map(([part]) => part);

/**
 * The front post must stand on the rear sight's line: a carry-handle upper's aperture is lower than a rail rear
 * sight's on a flat-top, and each front sight base is made for one of them.
 */
const sightHeight = (frame: ArFrame): Rule => {
  const id = `${frame.name}-sight-height`;
  return {
    id,
    title: 'The front sight base stands at the rear sight height',
    check: (r) =>
      placedOf(r, familyName(frame, 'front-sight-base')).flatMap((base) =>
        placedOf(r, familyName(frame, 'upper')).flatMap((upper) => {
          const height = paramOf(r, base, 'height');
          const rear = paramOf(r, upper, 'top');
          const rearSights = sightsBesides(r, base);
          if (height === undefined || rear === undefined || rearSights.length === 0 || height === rear) {
            return [];
          }
          const offMm = Math.abs(
            sightHeightExtraMm(sightHeightStandard(height)) - sightHeightExtraMm(sightHeightStandard(rear)),
          );
          return [
            issue(
              id,
              `${height} front sight base does not match the ${rear} rear sight: the sight line is ${offMm.toFixed(2)} mm off at the front`,
              [base, upper],
            ),
          ];
        }),
      ),
  };
};

/** A front post alone cannot be aimed with. */
const rearSightPresent = (frame: ArFrame): Rule => {
  const id = `${frame.name}-rear-sight`;
  return {
    id,
    title: 'A front sight base has a rear sight',
    check: (r) =>
      placedOf(r, familyName(frame, 'front-sight-base'))
        .filter((base) => sightsBesides(r, base).length === 0)
        .map((base) => issue(id, 'front sight base without a rear sight: add a rail rear sight or an optic', [base])),
  };
};

/** A stock slides on the extension of the buffer it is made for; the others differ in length. */
const tubeStock = (frame: ArFrame): Rule => {
  const id = `${frame.name}-tube-stock`;
  return {
    id,
    title: 'The stock fits the receiver extension',
    check: (r) =>
      placedOf(r, familyName(frame, 'stock')).flatMap((stock) =>
        placedOf(r, familyName(frame, 'receiver-extension')).flatMap((tube) => {
          const style = paramOf(r, stock, 'style');
          const tubeBuffer = paramOf(r, tube, 'buffer');
          if (style === undefined || tubeBuffer === undefined || stockBuffer(style) === tubeBuffer) {
            return [];
          }
          return [
            issue(
              id,
              `${style} stock needs the ${stockBuffer(style)} receiver extension; this lower carries the ${tubeBuffer} extension`,
              [stock, tube],
            ),
          ];
        }),
      ),
  };
};

/** The frame's magazine well is cut for one family of magazines. */
const magazineWell = (frame: ArFrame): Rule => {
  const id = `${frame.name}-magazine-well`;
  const accepted = MAGAZINE_FRAME_WELLS[frame.name];
  if (accepted === undefined) {
    throw new Error(`${frame.name}: no magazine well in the magazine content`);
  }
  return {
    id,
    title: `The magazine fits the ${frame.title} magazine well`,
    check: (r) =>
      placedOf(r, familyName(frame, 'lower')).flatMap((lower) =>
        r.connections.flatMap((rc) => {
          const ends = endsOf(rc, lower);
          if (ends?.own.port.id !== 'magazine' || !r.placed.has(ends.other.part)) {
            return [];
          }
          const profile = paramOf(r, ends.other.part, 'profile');
          return profile === undefined || accepted.includes(profile)
            ? []
            : [
                issue(id, `${profile} magazine does not fit the ${frame.title} magazine well`, [
                  ends.other.part,
                  lower,
                ]),
              ];
        }),
      ),
  };
};

/** The coupling rules of a frame's modules. */
export const arModularRules = (frame: ArFrame): Rule[] => [
  gasJournal(frame),
  dropInGas(frame),
  dropInCap(frame),
  freeFloatPastBase(frame),
  carryHandleRail(frame),
  sightHeight(frame),
  rearSightPresent(frame),
  tubeStock(frame),
  magazineWell(frame),
];
