// What a fitted garment bares at the knee, the elbow and the neck as the UAL doll plays the mannequin's gaits, judged
// for a camera straight above: rog1 draws its figures from there, 25 px tall at its default zoom and 50 px at its
// closest (docs/decisions/0023-ual-doll.md). A rigid piece rides one bone, so where two meet over a joint they part as
// it bends, and the rest check (docs/decisions/0019-garment-rest-check.md) cannot see it. This is a report, not a gate:
// what reads at that size is judged by eye, and the numbers say where to look.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coveredSurface, shownSkin } from '../site/clearance.mjs';
import { length, sub } from '../site/kinematics.mjs';
import { dollRig, restMeshes, treeMeshes } from './dollRig.mjs';
import { dollDressing, readDoll, readDressing, wornSites } from './dress.mjs';
import { boneMoves, ualClips } from './ualClip.mjs';

/** The doll the report is of: the one that stands on the skeleton the gaits are clips of. */
export const DOLL = 'ual';

/** The gaits, by the mannequin's clip. */
export const GAITS = { walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop' };
// The figure's height, UAL's, and the heights rog1 draws it at, in pixels.
const FIGURE = 1.83;
export const ZOOMS = [25, 50];
// A joint by the doll part of the bone below it: the skin within `REACH` of the joint on that bone and its parent
// belongs to it. The neck is its own part, all of it.
const HINGES = { knee: 'calf', elbow: 'lowerarm' };
const NECK = 'neck_01';
const REACH = 0.12;
const UP = [0, 1, 0];

/** A pixel's area on the figure at a zoom, in square metres. @param {number} zoom */
const pixel = (zoom) => (FIGURE / zoom) ** 2;

/**
 * The joints of a rig the report reads: each hinge once per side, as { joint, at, bones }, the bone whose head is the
 * joint and the bones whose skin meets there, and the neck.
 * @param {{ bones: readonly { id: string; parent: string | null; bind: { part: string } }[] }} rig
 */
export function jointsOf(rig) {
  const hinges = Object.entries(HINGES).flatMap(([joint, part]) =>
    rig.bones
      .filter(({ bind }) => bind.part === part)
      .map(({ id, parent }) => ({ joint, at: id, bones: parent === null ? [id] : [parent, id] })),
  );
  const neck = rig.bones
    .filter(({ bind }) => bind.part === NECK)
    .map(({ id }) => ({ joint: 'neck', at: id, bones: [id] }));
  return [...hinges, ...neck];
}

/**
 * A probe of one garment worn on the doll at rest (tools/dollRig.mjs, `restMeshes`): given the node tree of one key
 * of a clip (tools/ualClip.mjs), what shows at each joint, by joint name with the sides summed, as { shown, seen }:
 * the area of skin that shows there, in square metres, and how much of it a camera straight above sees, as the area
 * it fills in the picture. At a hinge only skin a piece is meant to cover counts, since a garment that stops short of
 * a joint bares it by design; the neck counts whole, as nothing fitted is meant to cover it and the question is how
 * much of it a collar leaves.
 * @param {Parameters<typeof coveredSurface>[0]} rig
 * @param {Parameters<typeof coveredSurface>[1]} rest
 */
export function jointProbe(rig, rest) {
  const joints = jointsOf(rig);
  const heads = new Map(rig.bones.map(({ id, head }) => [id, head]));
  // A joint's skin lies on the bones that meet there, so how far a point of theirs lies from it never changes: the
  // skin of each joint is chosen at rest. A hinge's is what a piece is meant to cover; the neck's is all of it.
  /** @param {{ joint: string; at: string; bones: readonly string[] }} joint @param {string} bone @param {number[]} point */
  const holds = ({ joint, at, bones }, bone, point) =>
    bones.includes(bone) && (joint === 'neck' || length(sub(point, heads.get(at))) <= REACH);
  const probe = shownSkin(rest, coveredSurface(rig, rest), {
    watched: (bone, point) => joints.some((joint) => holds(joint, bone, point)),
    toward: UP,
  });
  return (nodes) => {
    const shown = probe(boneMoves(rig, nodes));
    /** @type {Record<string, { shown: number; seen: number }>} */
    const totals = Object.fromEntries(joints.map(({ joint }) => [joint, { shown: 0, seen: 0 }]));
    for (const joint of joints) {
      const total = totals[joint.joint];
      for (const { bone, piece, rest: point, normal, area, seen } of shown) {
        if (!holds(joint, bone, point) || (joint.joint !== 'neck' && piece === undefined)) continue;
        total.shown += area;
        if (seen) total.seen += area * normal[1];
      }
    }
    return totals;
  };
}

/**
 * One garment's row of the report from what each key of each gait bares: per gait and joint, the key that shows the
 * most from above, with `shownCm2`, `seenCm2` and `px`, the pixels the seen skin fills at each zoom.
 * @param {Record<string, readonly Record<string, { shown: number; seen: number }>[]>} byGait each gait's keys in order
 */
export function worstKeys(byGait) {
  return Object.fromEntries(
    Object.entries(byGait).map(([gait, keys]) => {
      const joints = Object.keys(keys[0] ?? {});
      return [
        gait,
        Object.fromEntries(
          joints.map((joint) => {
            const worst = keys.reduce((best, key, index) => {
              const { shown, seen } = key[joint];
              return best === undefined || seen > best.seen || (seen === best.seen && shown > best.shown)
                ? { key: index, shown, seen }
                : best;
            }, undefined);
            return [
              joint,
              {
                key: worst.key,
                shownCm2: Math.round(worst.shown * 1e5) / 10,
                seenCm2: Math.round(worst.seen * 1e5) / 10,
                px: Object.fromEntries(ZOOMS.map((zoom) => [zoom, Math.round((worst.seen / pixel(zoom)) * 100) / 100])),
              },
            ];
          }),
        ),
      ];
    }),
  );
}

/**
 * One garment's row, the unit a worker runs: the garment of the built tree `built` worn on the UAL doll, probed at
 * rest and at every `step`th key of each gait.
 * @param {{ built: string; garment: string; step: number }} task
 */
export function garmentRow({ built, garment, step }) {
  const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
  const dressing = dollDressing(readDressing(), DOLL);
  const doll = readDoll(built, manifest, dressing);
  const rig = dollRig(doll, dressing);
  // A garment with pieces is placed by them alone, so it has no loose box or anchors to read.
  const loose = (/** @type {string} */ id) => {
    throw new Error(`${garment}: ${id} is placed loose, not by its worn pieces`);
  };
  const sites = wornSites({ id: garment }, { dressing, doll, models: manifest.models, boxOf: loose, anchorsOf: loose });
  const probe = jointProbe(rig, restMeshes(rig, sites, treeMeshes(built, manifest)));
  const clips = ualClips();
  const keysOf = (/** @type {string} */ clip) =>
    Array.from({ length: Math.ceil(clips.keys(clip) / step) }, (_, i) => probe(clips.nodes(clip, i * step)));
  const gaits = worstKeys(Object.fromEntries(Object.entries(GAITS).map(([gait, clip]) => [gait, keysOf(clip)])));
  // A key's place in its clip, not among the keys probed.
  for (const joints of Object.values(gaits)) for (const joint of Object.values(joints)) joint.key *= step;
  return { garment, rest: worstKeys({ rest: [probe(clips.nodes(null, 0))] }).rest, gaits };
}
