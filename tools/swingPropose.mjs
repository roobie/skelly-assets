// Proposes how to fix a moving site that swings into something: the shortest move of its hinge line, inboard and down, that
// lets it open all the way, else the longest stop it can have where it is. It only proposes. What the author does with
// it is a hand-merge into the part's pins or `open`, as the vehicle authoring tool's README says of Save, because the
// pins are drawn by a template that other vehicles share. The reason for the search is in
// `docs/decisions/0016-swing-check.md`, "Failure and fix".
import { dot, normalize, sub } from './packages/construct/src/foundation/math.ts';
import { centreOf, piecesBounds } from './packages/thing-core/src/motion.ts';
import { motionAtSite, resolveMotion, sweepTasks, swingReport, sweepVehicle } from './swingClearance.mjs';

const WINDOW = 4; // grains the hinge line may move each way
const DOWN = [0, -1, 0];
const MINIMUM_AXIS_SIDE = 0.2; // how far down must lie off the axis for the axis to have a down at all

const rounded = (value) => Math.round(value * 1e4) / 1e4;
const scaled = (vector, factor) => vector.map((value) => value * factor);
const along = (vector, axis) => sub(vector, scaled(axis, dot(vector, axis)));

// The directions the hinge line may move in, both across it: toward the part's middle, and down. A vertical line has no
// down across it, so it moves inboard only.
function directionsOf(site, axis) {
  const unit = normalize(sub(axis.to, axis.from));
  const inboard = along(sub(centreOf(piecesBounds(site.pieces)), axis.from), unit);
  if (Math.hypot(...inboard) < 1e-9) return [];
  const down = along(DOWN, unit);
  return [normalize(inboard), Math.hypot(...down) < MINIMUM_AXIS_SIDE ? null : normalize(down)];
}

// The hinge offsets to try, shortest first, as vectors in the vehicle frame.
function candidatesOf(site, axis, grain) {
  const [inboard, down] = directionsOf(site, axis);
  if (!inboard) return [];
  const steps = Array.from({ length: WINDOW + 1 }, (_, n) => n);
  const grid = steps.flatMap((i) => (down ? steps : [0]).map((j) => [i, j]));
  return grid
    .filter(([i, j]) => i + j > 0)
    .sort((p, q) => Math.hypot(...p) - Math.hypot(...q) || p[0] - q[0])
    .map(([i, j]) => scaled(inboard, i * grain).map((value, k) => value + (down ? down[k] * j * grain : 0)));
}

// A proposal for one site of a vehicle, from `readSitePieces`' output: `{ status, clear, offset?, stop?, reachable? }`.
// `status` is `ok` when the site already opens all the way, `moved` when the hinge line offset (`offset` in the vehicle
// frame, metres; `partOffset` the same in the part's own frame, as a far-side twin is drawn reflected) opens the whole
// stop, `shortened` when only a shorter `stop` (`{ value, total, unit }`, of the authored one) does, and `none` when
// nothing tried does. `reachable` is the most of its stop any tried hinge line opens.
export function proposeFix(pieces, vehicle, siteId) {
  const { grain, vehicles } = pieces;
  const task = sweepTasks({ ...pieces, vehicles: { [vehicle]: vehicles[vehicle] } })[vehicle];
  const site = task.sites.find(({ id }) => id === siteId);
  const family = Object.fromEntries([vehicle, vehicles[vehicle].parent].filter(Boolean).map((name) => [name, vehicles[name]]));
  const verdictOf = (adjust, only) => {
    const result = sweepVehicle({ ...task, adjust: { [siteId]: adjust }, only: only ? siteId : undefined });
    return swingReport({ grain, vehicles: family }, { [vehicle]: result }).verdicts[vehicle][siteId];
  };
  const before = verdictOf({}, false);
  if (before.status !== 'fails') return { status: 'ok', clear: before.clear };
  const placed = motionAtSite(resolveMotion(task.motions[site.part], task.forward, grain), site);
  const [stage] = placed;
  let reachable = before.clear;
  if (placed.length === 1 && stage.kind === 'hinge') {
    for (const offset of candidatesOf(site, stage.axis, grain)) {
      const adjust = { offset };
      const quick = verdictOf(adjust, true);
      reachable = Math.max(reachable, quick.clear);
      if (quick.status !== 'fails' && verdictOf(adjust, false).status !== 'fails') {
        const flip = ([x, y, z]) => (site.mirror ? [x, y, 0 - z] : [x, y, z]);
        return { status: 'moved', clear: 1, offset: offset.map(rounded), partOffset: flip(offset).map(rounded), reachable: 1 };
      }
    }
  }
  if (placed.length !== 1) return { status: 'none', clear: before.clear, reachable };
  const slide = stage.kind === 'slide';
  const total = slide ? Math.round(stage.travel * 1e3) : Math.round(Math.abs(stage.angle));
  for (let stop = Math.floor(before.clear * total); stop > 0; stop -= 1) {
    if (verdictOf({ scale: stop / total }, false).status !== 'fails') {
      return { status: 'shortened', clear: before.clear, stop: { value: stop, total, unit: slide ? 'mm' : '°' }, reachable };
    }
  }
  return { status: 'none', clear: before.clear, reachable };
}
