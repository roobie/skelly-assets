// How an assembly comes apart in an exploded view, shared by the showcase's viewer and the review tiles so both show
// the same picture. Plain arrays, so the rule holds without three.js.
//
// Parts come apart from the middle outward. Each part moves away from the assembly's centre, along the line from the
// centre through its own, by at least a share of its distance, and further until it clears every part closer to the
// centre. Moving along that line keeps each part in its own direction, so the view still reads as the assembly, and
// clearing the parts within lets nothing hide inside another's bounds, such as an engine's accessories in its core or
// a seat in a body shell. A part at the centre, which has no line of its own, is lifted.
import { UP } from './modelFrame.mjs';

const SPREAD = 0.3; // the least a part moves, as a share of its distance from the assembly's centre
const GAP = 0.02; // the clearance left between exploded parts, as a share of the assembly's longest side
const CENTRED = 1e-6; // a part this close to the centre, as a share of the longest side, has no line of its own

const centreOf = ({ min, max }) => min.map((low, axis) => (low + max[axis]) / 2);
const moved = ({ min, max }, offset) => ({ min: min.map((x, a) => x + offset[a]), max: max.map((x, a) => x + offset[a]) });
const overlaps = (a, b, gap) => [0, 1, 2].every((axis) => a.min[axis] < b.max[axis] + gap && b.min[axis] < a.max[axis] + gap);

// How much further a box moving along `direction` must go to clear `other` by `gap`: the least over the axes it moves
// along, since clearing one axis is enough.
function clearance(box, direction, other, gap) {
  let least = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const d = direction[axis];
    if (Math.abs(d) < CENTRED) continue;
    const to = d > 0 ? (other.max[axis] + gap - box.min[axis]) / d : (other.min[axis] - gap - box.max[axis]) / d;
    least = Math.min(least, to);
  }
  return least;
}

// Each part's offset in the exploded view, from the parts' boxes ({ min, max } in one frame), in the boxes' order. A
// lone part stays where it is.
export function explode(boxes) {
  if (boxes.length < 2) return boxes.map(() => [0, 0, 0]);
  const whole = {
    min: [0, 1, 2].map((axis) => Math.min(...boxes.map((b) => b.min[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...boxes.map((b) => b.max[axis]))),
  };
  const centre = centreOf(whole);
  const longest = Math.max(...whole.max.map((x, axis) => x - whole.min[axis]));
  const gap = GAP * longest;
  const parts = boxes.map((box, index) => {
    const away = centreOf(box).map((x, axis) => x - centre[axis]);
    const distance = Math.hypot(...away);
    const direction = distance > CENTRED * longest ? away.map((x) => x / distance) : UP;
    return { box, index, distance, direction };
  });
  const placed = [];
  const offsets = [];
  for (const part of [...parts].sort((a, b) => a.distance - b.distance || a.index - b.index)) {
    let travel = SPREAD * part.distance;
    // Each clearing moves the part out past one placed part for good, since it only ever moves further along its line.
    for (;;) {
      const at = moved(part.box, part.direction.map((d) => d * travel));
      // Half the gap counts as clear, so rounding never catches a part just moved to the gap's edge.
      const blocking = placed.find((other) => overlaps(at, other, gap / 2));
      if (!blocking) break;
      travel += clearance(at, part.direction, blocking, gap);
    }
    offsets[part.index] = part.direction.map((d) => d * travel);
    placed.push(moved(part.box, offsets[part.index]));
  }
  return offsets;
}
