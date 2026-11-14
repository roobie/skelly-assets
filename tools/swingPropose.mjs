// Proposes how to fix a moving site that swings into something: the shortest move of its hinge line toward the part's
// middle and down that lets it open all the way, else the longest stop it can have where it is. The change is made to
// the part, so every site of that part in the vehicle takes it, a far-side twin reflected, and the vehicle's report must
// have no problem naming the part. Other vehicles that place the part are not swept, so a proposal never claims to clear
// them. It only proposes. What the author does with it is a hand-merge into the part's pins or `open`, as
// `tools/packages/vehicle-authoring-tool/README.md`, "Save is a download to hand-merge", says of Save, because the pins
// are drawn by a template that other vehicles share. The reason for the search is in
// `docs/decisions/0016-swing-check.md`, "A failing site gets a proposal, never an edit".
import { dot, normalize, sub } from './packages/construct/src/foundation/math.ts';
import { centreOf, piecesBounds } from './packages/thing-core/src/motion.ts';
import { adjustedMotion, motionAtSite, sweepTasks, swingReport, sweepVehicle } from './swingClearance.mjs';

const WINDOW = 4; // grains the hinge line may move each way
const DOWN = [0, -1, 0];
const MINIMUM_AXIS_SIDE = 0.2; // how far down must lie off the axis for the axis to have a down at all

const rounded = (value) => Math.round(value * 1e4) / 1e4;
const scaled = (vector, factor) => vector.map((value) => value * factor);
const along = (vector, axis) => sub(vector, scaled(axis, dot(vector, axis)));

// The directions the hinge line may move in, both across it: toward the part's middle, and down. A vertical line has no
// down across it, so it moves toward the middle only.
function directionsOf(site, axis) {
  const unit = normalize(sub(axis.to, axis.from));
  const middle = along(sub(centreOf(piecesBounds(site.pieces)), axis.from), unit);
  if (Math.hypot(...middle) < 1e-9) return [];
  const down = along(DOWN, unit);
  return [normalize(middle), Math.hypot(...down) < MINIMUM_AXIS_SIDE ? null : normalize(down)];
}

// The hinge offsets to try, shortest first, as vectors in the vehicle frame.
function candidatesOf(site, axis, grain) {
  const [middle, down] = directionsOf(site, axis);
  if (!middle) return [];
  const steps = Array.from({ length: WINDOW + 1 }, (_, n) => n);
  const grid = steps.flatMap((i) => (down ? steps : [0]).map((j) => [i, j]));
  return grid
    .filter(([i, j]) => i + j > 0)
    .sort((p, q) => Math.hypot(...p) - Math.hypot(...q) || p[0] - q[0])
    .map(([i, j]) => scaled(middle, i * grain).map((value, k) => value + (down ? down[k] * j * grain : 0)));
}

// `proposeFix` as a worker pool runs it, which takes one argument: a search sweeps for minutes, which a dev server must
// not do on its own thread.
export const proposeTask = ({ pieces, vehicle, site }) => proposeFix(pieces, vehicle, site);

// A proposal for one site of a vehicle, from `readSitePieces`' output: `{ status, clear, offset?, stop?, reachable?,
// entries? }`. `status` is `ok` when no site of the site's part fails in the vehicle's report, `moved` when the hinge line
// offset (`offset` in the vehicle frame, metres, for this site; `partOffset` in the part's own frame, as a far-side twin
// is drawn reflected) makes none fail, `shortened` when only a shorter `stop` (`{ value, total, unit }`, of the authored
// one) does, and `none` when nothing tried does. `reachable` is the most of its stop any tried hinge line opens.
// `entries` are the vehicle's entries on the part that the fix leaves stale or capped far above their contact, which the
// author drops or judges again.
export function proposeFix(pieces, vehicle, siteId) {
  const { grain, vehicles } = pieces;
  const task = sweepTasks({ ...pieces, vehicles: { [vehicle]: vehicles[vehicle] } })[vehicle];
  const site = task.sites.find(({ id }) => id === siteId);
  const { part } = site;
  const ofPart = task.sites.filter((other) => other.part === part);
  const ids = new Set(ofPart.map(({ id }) => id));
  const family = Object.fromEntries([vehicle, vehicles[vehicle].parent].filter(Boolean).map((name) => [name, vehicles[name]]));
  const reportOf = (adjust, only) => {
    const result = sweepVehicle({ ...task, adjust: { [part]: adjust }, only: only ? siteId : undefined });
    return swingReport({ grain, vehicles: family }, { [vehicle]: result });
  };
  // A sweep of the site alone is cheap and fails whenever the whole vehicle's does, so it goes first.
  const quickClear = (adjust) => reportOf(adjust, true).verdicts[vehicle][siteId];
  // What a fix has to clear is a failing verdict at any site of the part: its own swing, or a meeting with both open. A
  // contact between two other parts, or one that a part's rest pose makes with a part that moves, is not the part's to fix.
  const failing = (report) => ofPart.some(({ id }) => report.verdicts[vehicle][id]?.status === 'fails');
  // The entries of this vehicle on the part's sites that a report has gone stale or capped far above their contact.
  const wornBy = (report) => report.entryProblems.filter((entry) => entry.vehicle === vehicle && entry.sites.some((id) => ids.has(id))).map(({ message }) => message);
  const before = reportOf({}, false);
  const start = before.verdicts[vehicle][siteId];
  if (!failing(before)) return { status: 'ok', clear: start.clear };
  const known = new Set(wornBy(before));
  // The entries a fix leaves worn that were not already, for the author to drop or judge again.
  const holds = (adjust) => {
    const report = reportOf(adjust, false);
    return failing(report) ? null : { entries: wornBy(report).filter((message) => !known.has(message)) };
  };
  const [stage, ...rest] = motionAtSite(adjustedMotion(task.motions[part], {}, task.forward, grain), site);
  let reachable = start.clear;
  if (rest.length > 0) return { status: 'none', clear: start.clear, reachable };
  if (stage.kind === 'hinge') {
    const flip = ([x, y, z]) => (site.mirror ? [x, y, 0 - z] : [x, y, z]);
    for (const offset of candidatesOf(site, stage.axis, grain)) {
      const adjust = { offset: flip(offset) };
      try {
        adjustedMotion(task.motions[part], adjust, task.forward, grain);
      } catch {
        continue; // the build would refuse these pins: a line through the part's middle carries it no way
      }
      const quick = quickClear(adjust);
      reachable = Math.max(reachable, quick.clear);
      const held = quick.status === 'fails' ? null : holds(adjust);
      if (held) {
        return { status: 'moved', clear: 1, offset: offset.map(rounded), partOffset: adjust.offset.map(rounded), reachable: 1, ...held };
      }
    }
  }
  const slide = stage.kind === 'slide';
  const total = slide ? Math.round(stage.travel * 1e3) : Math.round(Math.abs(stage.angle));
  // Only a stop short of the first contact nobody allows can help; one short of an allowed contact is already allowed.
  const unallowed = ofPart.flatMap(({ id }) => before.verdicts[vehicle][id]?.contacts ?? []).filter(({ allowed, at }) => !allowed && at !== undefined);
  const first = unallowed.length > 0 ? Math.min(...unallowed.map(({ at }) => at)) : 1;
  for (let stop = Math.min(Math.floor(first * total), total - 1); stop > 0; stop -= 1) {
    const adjust = { scale: stop / total };
    const held = quickClear(adjust).status === 'fails' ? null : holds(adjust);
    if (held) {
      return { status: 'shortened', clear: start.clear, stop: { value: stop, total, unit: slide ? 'mm' : '°' }, reachable, ...held };
    }
  }
  return { status: 'none', clear: start.clear, reachable };
}
