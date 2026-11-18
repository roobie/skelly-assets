// @ts-check
// Proposes how to fix a moving site that swings into something: the shortest move of its hinge line toward the part's
// middle and down that lets it open all the way, else the longest stop it can have where it is. The change is made to
// the part, so every site of that part in the vehicle takes it, a far-side twin reflected, and the vehicle's report must
// have no problem naming the part. Other vehicles that place the part are not swept, so a proposal never claims to clear
// them. It only proposes. What the author does with it is a hand-merge into the part's pins or `open`, as
// `tools/packages/vehicle-authoring-tool/README.md`, "Save is a download to hand-merge", says of Save, because the pins
// are drawn by a template that other vehicles share. The reason for the search is in
// `docs/decisions/0016-swing-check.md`, "A failing site gets a proposal, never an edit".
/** @import { Vec3 } from './packages/construct/src/foundation/math.ts' */
/** @import { HingeAxis } from './packages/thing-core/src/schema.ts' */
/** @import { SitePieces, SiteVehicle } from './siteOverlap.mjs' */
/** @import { Adjust, SweepSite, SwingReport } from './swingClearance.mjs' */

import { AUTHORED_LATERAL, motionAtSite } from '../site/motionPose.mjs';
import { dot, normalize, perAxis, scale, sub } from './packages/construct/src/foundation/math.ts';
import { centreOf, piecesBounds } from './packages/thing-core/src/motion.ts';
import { adjustedMotion, sweepTasks, sweepVehicle, swingReport } from './swingClearance.mjs';

/**
 * A proposal for one site. `offset` is in the vehicle frame, metres, for this site; `partOffset` in the part's own
 * frame, as a far-side twin is drawn reflected; `stop` is of the authored one.
 * @typedef {object} Proposal
 * @property {'ok' | 'moved' | 'shortened' | 'none'} status
 * @property {number} clear
 * @property {Vec3} [offset]
 * @property {Vec3} [partOffset]
 * @property {{ value: number; total: number; unit: 'mm' | '°' }} [stop]
 * @property {number} [reachable]
 * @property {string[]} [entries]
 */

const WINDOW = 4; // grains the hinge line may move each way
/** @type {Vec3} */
const DOWN = [0, -1, 0];
const MINIMUM_AXIS_SIDE = 0.2; // how far down must lie off the axis for the axis to have a down at all

/** @param {number} value */
const rounded = (value) => Math.round(value * 1e4) / 1e4;
/**
 * @param {Vec3} vector
 * @param {Vec3} axis
 */
const along = (vector, axis) => sub(vector, scale(axis, dot(vector, axis)));

/**
 * The directions the hinge line may move in, both across it: toward the part's middle, and down. A vertical line has
 * no down across it, so it moves toward the middle only.
 * @param {SweepSite} site
 * @param {HingeAxis} axis
 * @returns {readonly [] | readonly [Vec3, Vec3 | null]}
 */
function directionsOf(site, axis) {
  const unit = normalize(sub(axis.to, axis.from));
  const middle = along(sub(centreOf(piecesBounds(site.pieces)), axis.from), unit);
  if (Math.hypot(...middle) < 1e-9) return [];
  const down = along(DOWN, unit);
  return [normalize(middle), Math.hypot(...down) < MINIMUM_AXIS_SIDE ? null : normalize(down)];
}

/**
 * The hinge offsets to try, shortest first, as vectors in the vehicle frame.
 * @param {SweepSite} site
 * @param {HingeAxis} axis
 * @param {number} grain
 * @returns {Vec3[]}
 */
function candidatesOf(site, axis, grain) {
  const [middle, down] = directionsOf(site, axis);
  if (!middle) return [];
  const steps = Array.from({ length: WINDOW + 1 }, (_, n) => n);
  /** @type {(readonly [number, number])[]} */
  const grid = steps.flatMap((i) => (down ? steps : [0]).map((j) => [i, j]));
  return grid
    .filter(([i, j]) => i + j > 0)
    .sort((p, q) => Math.hypot(...p) - Math.hypot(...q) || p[0] - q[0])
    .map(([i, j]) => {
      const toward = scale(middle, i * grain);
      return perAxis((k) => toward[k] + (down ? down[k] * j * grain : 0));
    });
}

/**
 * `proposeFix` as a worker pool runs it, which takes one argument: a search sweeps for minutes, which a dev server must
 * not do on its own thread.
 * @param {{ pieces: SitePieces; vehicle: string; site: string }} task
 */
export const proposeTask = ({ pieces, vehicle, site }) => proposeFix(pieces, vehicle, site);

/**
 * A proposal for one site of a vehicle, from `readSitePieces`' output. `status` is `ok` when no site of the site's
 * part fails in the vehicle's report, `moved` when the hinge line offset makes none fail, `shortened` when only a
 * shorter `stop` does, and `none` when nothing tried does. `reachable` is the most of its stop any tried hinge line
 * opens. `entries` are the vehicle's entries on the part that the fix leaves stale or capped far above their contact,
 * which the author drops or judges again.
 * @param {SitePieces} pieces
 * @param {string} vehicle
 * @param {string} siteId
 * @returns {Proposal}
 */
export function proposeFix(pieces, vehicle, siteId) {
  const { grain, vehicles } = pieces;
  const placements = vehicles[vehicle];
  if (placements === undefined) throw new Error(`${vehicle} is no vehicle with drawn sites`);
  const task = sweepTasks({ ...pieces, vehicles: { [vehicle]: placements } })[vehicle];
  if (task === undefined) throw new Error(`${vehicle} has no part that moves`);
  const site = task.sites.find(({ id }) => id === siteId);
  if (site === undefined) throw new Error(`${siteId} is no drawn site of ${vehicle}`);
  const { part } = site;
  const motion = task.motions[part];
  if (motion === undefined) throw new Error(`${siteId} of ${vehicle} places ${part}, which does not move`);
  const ofPart = task.sites.filter((other) => other.part === part);
  const ids = new Set(ofPart.map(({ id }) => id));
  /** @type {Record<string, SiteVehicle>} */
  const family = { [vehicle]: placements };
  const parent = placements.parent === null ? undefined : vehicles[placements.parent];
  if (placements.parent && parent) family[placements.parent] = parent;
  /**
   * @param {Adjust} adjust
   * @param {boolean} only
   */
  const reportOf = (adjust, only) => {
    const result = sweepVehicle({ ...task, adjust: { [part]: adjust }, only: only ? siteId : undefined });
    return swingReport({ grain, vehicles: family }, { [vehicle]: result });
  };
  /**
   * @param {SwingReport} report
   * @param {string} id
   */
  const verdictOf = (report, id) => report.verdicts[vehicle]?.[id];
  /** @param {SwingReport} report */
  const siteVerdict = (report) => {
    const verdict = verdictOf(report, siteId);
    if (verdict === undefined) throw new Error(`${siteId} of ${vehicle} is no site that moves on its own`);
    return verdict;
  };
  // A sweep of the site alone is cheap and fails whenever the whole vehicle's does, so it goes first.
  /** @param {Adjust} adjust */
  const quickClear = (adjust) => siteVerdict(reportOf(adjust, true));
  // What a fix has to clear is a failing verdict at any site of the part: its own swing, or a meeting with both open. A
  // contact between two other parts, or one that a part's rest pose makes with a part that moves, is not the part's to fix.
  /** @param {SwingReport} report */
  const failing = (report) => ofPart.some(({ id }) => verdictOf(report, id)?.status === 'fails');
  // The entries of this vehicle on the part's sites that a report has gone stale or capped far above their contact.
  /** @param {SwingReport} report */
  const wornBy = (report) =>
    report.entryProblems
      .filter((entry) => entry.vehicle === vehicle && entry.sites.some((id) => ids.has(id)))
      .map(({ message }) => message);
  const before = reportOf({}, false);
  const start = siteVerdict(before);
  if (!failing(before)) return { status: 'ok', clear: start.clear };
  const known = new Set(wornBy(before));
  // The entries a fix leaves worn that were not already, for the author to drop or judge again.
  /** @param {Adjust} adjust */
  const holds = (adjust) => {
    const report = reportOf(adjust, false);
    return failing(report) ? null : { entries: wornBy(report).filter((message) => !known.has(message)) };
  };
  const [stage, ...rest] = motionAtSite(adjustedMotion(motion, {}, task.forward, grain), site, AUTHORED_LATERAL);
  if (stage === undefined) throw new Error(`${part} has a motion with no stage`);
  let reachable = start.clear;
  if (rest.length > 0) return { status: 'none', clear: start.clear, reachable };
  if (stage.kind === 'hinge') {
    /** @type {(offset: Vec3) => Vec3} */
    const flip = ([x, y, z]) => (site.mirror ? [x, y, 0 - z] : [x, y, z]);
    for (const offset of candidatesOf(site, stage.axis, grain)) {
      const adjust = { offset: flip(offset) };
      try {
        adjustedMotion(motion, adjust, task.forward, grain);
      } catch {
        continue; // the build would refuse these pins: a line through the part's middle carries it no way
      }
      const quick = quickClear(adjust);
      reachable = Math.max(reachable, quick.clear);
      const held = quick.status === 'fails' ? null : holds(adjust);
      if (held) {
        return {
          status: 'moved',
          clear: 1,
          offset: perAxis((k) => rounded(offset[k])),
          partOffset: perAxis((k) => rounded(adjust.offset[k])),
          reachable: 1,
          ...held,
        };
      }
    }
  }
  const slide = stage.kind === 'slide';
  const total = slide ? Math.round(stage.travel * 1e3) : Math.round(Math.abs(stage.angle));
  // Only a stop short of the first contact nobody allows can help; one short of an allowed contact is already allowed.
  const unallowed = ofPart
    .flatMap(({ id }) => verdictOf(before, id)?.contacts ?? [])
    .flatMap(({ allowed, at }) => (!allowed && at !== undefined ? [at] : []));
  const first = unallowed.length > 0 ? Math.min(...unallowed) : 1;
  for (let stop = Math.min(Math.floor(first * total), total - 1); stop > 0; stop -= 1) {
    const adjust = { scale: stop / total };
    const held = quickClear(adjust).status === 'fails' ? null : holds(adjust);
    if (held) {
      return {
        status: 'shortened',
        clear: start.clear,
        stop: { value: stop, total, unit: slide ? 'mm' : '°' },
        reachable,
        ...held,
      };
    }
  }
  return { status: 'none', clear: start.clear, reachable };
}
