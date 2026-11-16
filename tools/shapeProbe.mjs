// Shape probes over a built model, for ranking the catalogue rows a reviewer has not yet looked at: pieces that float
// apart from the rest, and shapes that miss their own mirror or quarter turn by a little. Neither is a rule a model
// must keep, since a set of dice lies apart and a teapot has its spout on one side, so they rank a review queue rather
// than fail a build; see ../docs/decisions/0018-review-probes.md.
//
// Both read the model as the cells of its own voxel lattice that its surface passes through, so a model is judged at
// the grain it is drawn at and a smooth part at the grain of the voxel parts beside it.
import { readFileSync } from 'node:fs';
import { sampledSurface } from '../site/clearance.mjs';
import { modelMeshes } from './dress.mjs';
import { glbJson } from './glb.mjs';

// The grain a model drawn only of smooth parts is read at: the finest any catalogue row is voxelized at, so no gap a
// voxel model could show is lost.
export const SMOOTH_GRAIN = 0.002;

// The finest voxel grain the model's primitives name, or SMOOTH_GRAIN when none is voxelized.
export function modelGrain(gltf) {
  const grains = gltf.meshes.flatMap(({ primitives }) => primitives.map(({ extras }) => extras?.voxelGrain)).filter((g) => g > 0);
  return grains.length > 0 ? Math.min(...grains) : SMOOTH_GRAIN;
}

// A box of lattice cells, each holding 0 for empty or one plus the index of the slot drawn there in `slots`. The box
// has a ring of empty cells round what is drawn, so a step to any neighbour of a drawn cell stays inside it.
export function cellGrid(drawn, slots) {
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  for (const { cell } of drawn) for (let a = 0; a < 3; a++) {
    low[a] = Math.min(low[a], cell[a] - 1);
    high[a] = Math.max(high[a], cell[a] + 1);
  }
  const size = drawn.length > 0 ? high.map((h, a) => h - low[a] + 1) : [0, 0, 0];
  const grid = { low, size, slots, slot: new Uint8Array(size[0] * size[1] * size[2]) };
  for (const { cell, slot } of drawn) grid.slot[indexOf(grid, cell)] = slot + 1;
  return grid;
}

// A cell's index in the grid's array, or -1 outside the box.
const indexOf = ({ low, size }, [i, j, k]) => {
  const [x, y, z] = [i - low[0], j - low[1], k - low[2]];
  return x < 0 || y < 0 || z < 0 || x >= size[0] || y >= size[1] || z >= size[2] ? -1 : (x * size[1] + y) * size[2] + z;
};
const cellAt = ({ low, size }, index) => [
  Math.floor(index / (size[1] * size[2])) + low[0],
  (Math.floor(index / size[2]) % size[1]) + low[1],
  (index % size[2]) + low[2],
];
const drawnCells = (grid) => grid.slot.reduce((found, slot, index) => (slot > 0 ? (found.push(index), found) : found), []);

// The most cells a model is read across along its longest side. A model larger than this at its own grain is read
// coarser, so a model's cost stays bounded at the price of missing one-cell defects on the largest models.
export const MOST_CELLS = 256;

// The grain a model is read at: its own, or coarser when MOST_CELLS of it would not span the model's longest side.
export function readGrain(meshes, grain) {
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  for (const { positions } of meshes) for (let i = 0; i < positions.length; i++) {
    low[i % 3] = Math.min(low[i % 3], positions[i]);
    high[i % 3] = Math.max(high[i % 3], positions[i]);
  }
  return Math.max(grain, Math.max(...high.map((h, a) => h - low[a])) / MOST_CELLS);
}

// The lattice cells the model's surface passes through, as a cell grid. A surface sample steps a quarter cell inward
// along its normal before it is binned, so a voxel face, which lies on a cell boundary, counts for the cell it closes.
export function surfaceCells(buffer) {
  const gltf = glbJson(buffer);
  const slots = [...new Set(gltf.meshes.flatMap(({ primitives }) => primitives.map(({ extras }) => extras?.slot ?? '')))];
  const bySlot = slots.map((name) => modelMeshes(buffer, (_part, _piece, own) => (own ?? '') === name));
  const grain = readGrain(bySlot.flat(), modelGrain(gltf));
  const drawn = bySlot.flatMap((meshes, slot) => meshes
    .flatMap((mesh) => sampledSurface(mesh, grain / 2))
    .map(({ point, normal }) => ({ cell: point.map((x, a) => Math.floor((x - (normal[a] * grain) / 4) / grain)), slot })));
  return cellGrid(drawn, slots);
}

// The model's separate pieces: the groups of cells that touch across a face, edge or corner, largest first, each as
// { cells, gap }, where `gap` is how many empty cells part it from the nearest other piece, up to `reach` (Infinity
// past it). One piece means the model holds together.
export function pieces(grid, reach = 4) {
  const owner = new Int32Array(grid.slot.length).fill(-1);
  const groups = [];
  for (const start of drawnCells(grid)) {
    if (owner[start] >= 0) continue;
    const group = [start];
    owner[start] = groups.length;
    for (let n = 0; n < group.length; n++) {
      const [i, j, k] = cellAt(grid, group[n]);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
        const next = indexOf(grid, [i + di, j + dj, k + dk]);
        if (grid.slot[next] > 0 && owner[next] < 0) {
          owner[next] = groups.length;
          group.push(next);
        }
      }
    }
    groups.push(group);
  }
  const gapOf = (own) => {
    let best = Infinity;
    for (const cell of groups[own]) {
      const [i, j, k] = cellAt(grid, cell);
      for (let di = -reach; di <= reach; di++) for (let dj = -reach; dj <= reach; dj++) for (let dk = -reach; dk <= reach; dk++) {
        const other = owner[indexOf(grid, [i + di, j + dj, k + dk])];
        if (other !== undefined && other >= 0 && other !== own) best = Math.min(best, Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk)) - 1);
      }
      if (best === 0) break;
    }
    return best;
  };
  return groups
    .map((group, own) => ({ cells: group.length, gap: groups.length > 1 ? gapOf(own) : 0 }))
    .sort((a, b) => b.cells - a.cells);
}

// How the drawn cells miss their images under `image`, a map of a cell to the cell it should match: per slot, the
// cells it draws and how many find no cell of the same slot at their image.
const missUnder = (grid, image) => {
  const bySlot = Object.fromEntries(grid.slots.map((name) => [name, { cells: 0, missed: 0 }]));
  for (const index of drawnCells(grid)) {
    const own = bySlot[grid.slots[grid.slot[index] - 1]];
    own.cells++;
    if (grid.slot[indexOf(grid, image(cellAt(grid, index)))] !== grid.slot[index]) own.missed++;
  }
  for (const name of Object.keys(bySlot)) if (bySlot[name].cells === 0) delete bySlot[name];
  return { bySlot, missed: Object.values(bySlot).reduce((sum, { missed }) => sum + missed, 0) };
};

// The planes tried square to `axis`, as twice their distance from the lattice origin in cells: they step by half a
// cell, so a plane can lie on a cell boundary or through cell centres, `drift` cells either side of the middle of what
// is drawn, because a part a cell off the axis moves the middle of the box.
const planesAlong = (grid, axis, drift) => {
  const middle = 2 * grid.low[axis] + grid.size[axis] - 1;
  return Array.from({ length: 4 * drift + 1 }, (_, n) => middle - 2 * drift + n);
};

// How each slot misses its mirror across the plane square to `axis` that it misses least: the plane, in cells from the
// lattice origin, and per slot the cells it draws and how many find no cell of the same slot across it.
export function mirrorMiss(grid, axis, drift = 2) {
  let best;
  for (const twice of planesAlong(grid, axis, drift)) {
    // A plane `twice` half-cells from the origin takes cell i to cell twice - 1 - i.
    const found = missUnder(grid, (cell) => cell.map((c, a) => (a === axis ? twice - 1 - c : c)));
    if (!best || found.missed < best.missed) best = { plane: twice / 2, ...found };
  }
  return best;
}

// How each slot misses itself turned a quarter about the line along `axis` that it misses least, as mirrorMiss gives
// it, with the line's place across the other two axes. A round or square shape, such as a can or a cross, keeps its
// quarter turn, so arms of unequal length or a ring sampled unevenly show here and not across a mirror.
export function quarterMiss(grid, axis, drift = 1) {
  const [u, v] = [0, 1, 2].filter((a) => a !== axis);
  let best;
  for (const twiceU of planesAlong(grid, u, drift)) for (const twiceV of planesAlong(grid, v, drift)) {
    // A quarter turn takes cell centres to cell centres only about a line through cell corners or cell centres.
    if ((twiceU - twiceV) % 2 !== 0) continue;
    const [pu, pv] = [twiceU / 2, twiceV / 2];
    // About (pu, pv) the centre c + 1/2 turns as (du, dv) -> (-dv, du).
    const found = missUnder(grid, (cell) => {
      const turned = [...cell];
      turned[u] = pu + pv - cell[v] - 1;
      turned[v] = pv - pu + cell[u];
      return turned;
    });
    if (!best || found.missed < best.missed) best = { line: [twiceU / 2, twiceV / 2], ...found };
  }
  return best;
}

// The cells of one slot, as a grid of their own, so a part is judged about its own middle.
export function slotGrid(grid, name) {
  const slot = grid.slots.indexOf(name);
  const drawn = drawnCells(grid).filter((index) => grid.slot[index] === slot + 1).map((index) => ({ cell: cellAt(grid, index), slot: 0 }));
  return cellGrid(drawn, [name]);
}

// What counts as a near miss: a share of a slot's cells above what sampling a true mirror image leaves unmatched and
// below what a shape that is not meant to be symmetric misses, and enough cells that one stray cell is not a finding.
export const NEAR_MISS = { least: 0.04, most: 0.3, cells: 4 };
// The model frame's level axes, x and z.
const LEVEL_AXES = [0, 2];
// The fewest cells a piece apart from the rest needs to be a finding, so a stray sampled cell is not one.
export const FLOATING_CELLS = 4;

// The findings of the shape probes on a cell grid, each { probe, ...what it found }, with `cells` the size of the
// finding in cells and `of` the cells it is a share of:
// - `floating`: pieces apart from the largest, with the fewest empty cells between any of them and the rest when that is
//   within the reach `pieces` looks;
// - `mirror` and `quarter`: a slot that misses its own mirror across `axis`, or its quarter turn about it, by a little.
//   A mirror is tried only across the level axes, since a thing stands on its base and its top is rarely its base
//   turned over (see ../docs/decisions/0002-model-frame.md for which axis is up).
export function shapeFindings(grid) {
  const findings = [];
  const apart = pieces(grid).slice(1).filter(({ cells }) => cells >= FLOATING_CELLS);
  if (apart.length > 0) {
    const gap = Math.min(...apart.map(({ gap: own }) => own));
    findings.push({
      probe: 'floating',
      pieces: apart.length,
      cells: apart.reduce((sum, { cells }) => sum + cells, 0),
      of: drawnCells(grid).length,
      ...(gap < Infinity ? { gap } : {}),
    });
  }
  const near = ({ cells, missed }) => missed >= NEAR_MISS.cells && missed > NEAR_MISS.least * cells && missed <= NEAR_MISS.most * cells;
  for (const name of grid.slots) {
    const slot = slotGrid(grid, name);
    for (const axis of LEVEL_AXES) {
      const mirror = mirrorMiss(slot, axis).bySlot[name];
      if (near(mirror)) findings.push({ probe: 'mirror', slot: name, axis, cells: mirror.missed, of: mirror.cells });
    }
    for (const axis of [0, 1, 2]) {
      // Only a slot as wide as it is deep across `axis` can keep its quarter turn.
      const [u, v] = [0, 1, 2].filter((a) => a !== axis);
      if (Math.abs(slot.size[u] - slot.size[v]) > 2) continue;
      const quarter = quarterMiss(slot, axis).bySlot[name];
      if (near(quarter)) findings.push({ probe: 'quarter', slot: name, axis, cells: quarter.missed, of: quarter.cells });
    }
  }
  return findings;
}

// The findings of the shape probes on the model file at `path`.
export const modelFindings = (path) => shapeFindings(surfaceCells(readFileSync(path)));
