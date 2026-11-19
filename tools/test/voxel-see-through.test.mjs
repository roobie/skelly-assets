// @ts-check
// Scans every voxel model of the firearms pack, as the build writes it, for lines a player sees straight through.
// A hole is an empty lattice line along an axis whose four neighbouring lines are all filled. Holes are checked per
// part: a gap between two parts is out of scope here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { glbAccessor, glbJson } from '../glb.mjs';
import { readRecipes } from '../recipes.mjs';
import { generateRow, recipeTools } from '../recipeTools.mjs';
import { installJsonnetSources } from '../sources.mjs';

await installJsonnetSources();

const PACK = 'skelly.firearms';

/**
 * @typedef {0 | 1 | 2} Axis
 * @typedef {[number, number, number]} Point
 * @typedef {[Point, Point, Point]} Triangle
 * @typedef {[number, number]} Cell
 */

const REVOLVER_FRAME = 'revolver-frame along z at x=-58.0 y=-54.0 mm';

/**
 * Holes the authored solids themselves leave, which no bevel makes: backlog B-XDYII4SC5V3A4B74. Each is a model and the
 * exact lines it leaves, by mesh, axis and the position in millimetres of the line in the mesh's frame.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
const AUTHORED_SEAMS = {
  revolver: [`frame:${REVOLVER_FRAME}`],
  revolver_frame: [`revolver_frame:${REVOLVER_FRAME}`],
  weapon_sling: [
    'equipment:webbingSling along y at x=-155.0 z=-35.0 mm',
    'equipment:webbingSling along y at x=155.0 z=35.0 mm',
  ],
};

/** @type {readonly Cell[]} */
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * The two axes across `axis`.
 * @param {Axis} axis
 * @returns {[Axis, Axis]}
 */
const across = (axis) => (axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1]);

/**
 * The lattice lines along `axis` a face square to it covers, as cells of the plane across it.
 * @param {Triangle} triangle in grains
 * @param {Axis} axis
 * @returns {Cell[]}
 */
const cellsCovered = ([a, b, c], axis) => {
  const [u, v] = across(axis);
  /** @type {Triangle} */
  const corners = [a, b, c];
  const us = corners.map((p) => p[u]);
  const vs = corners.map((p) => p[v]);
  /**
   * @param {Point} o
   * @param {Point} p
   * @param {Cell} q
   */
  const cross = (o, p, q) => (p[u] - o[u]) * (q[1] - o[v]) - (p[v] - o[v]) * (q[0] - o[u]);
  /** @type {Cell[]} */
  const cells = [];
  for (let i = Math.floor(Math.min(...us)); i < Math.max(...us); i++) {
    for (let j = Math.floor(Math.min(...vs)); j < Math.max(...vs); j++) {
      const sides = [cross(a, b, [i + 0.5, j + 0.5]), cross(b, c, [i + 0.5, j + 0.5]), cross(c, a, [i + 0.5, j + 0.5])];
      if (sides.every((x) => x >= -1e-6) || sides.every((x) => x <= 1e-6)) cells.push([i, j]);
    }
  }
  return cells;
};

/**
 * Each empty line along an axis whose four neighbours are filled, by axis and the position of the line in millimetres.
 * The faces of a voxel surface fill every lattice line they cover along their normal.
 * @param {readonly Triangle[]} triangles in metres
 * @param {number} grain
 * @returns {string[]}
 */
const holesOf = (triangles, grain) => {
  const first = triangles[0]?.[0];
  if (first === undefined) return [];
  // The lattice may start at a fraction of a grain: shift it onto whole grains, and shift back to report.
  const shift = /** @type {Point} */ (first.map((x) => x - Math.round(x / grain) * grain));
  /** @type {[Set<string>, Set<string>, Set<string>]} */
  const filled = [new Set(), new Set(), new Set()];
  for (const triangle of triangles) {
    const [a, b, c] = /** @type {Triangle} */ (triangle.map((p) => p.map((x, k) => (x - (shift[k] ?? 0)) / grain)));
    const flat = /** @type {Axis[]} */ ([0, 1, 2]).find(
      (k) => Math.abs(a[k] - b[k]) < 1e-3 && Math.abs(a[k] - c[k]) < 1e-3,
    );
    if (flat === undefined) continue;
    for (const cell of cellsCovered([a, b, c], flat)) filled[flat].add(cell.join());
  }
  const holes = new Set();
  for (const axis of /** @type {Axis[]} */ ([0, 1, 2])) {
    const [u, v] = across(axis);
    /** @param {Cell} cell */
    const isFilled = ([i, j]) => filled[axis].has(`${i},${j}`);
    /** @param {number} cell @param {Axis} k */
    const at = (cell, k) => (((cell + 0.5) * grain + shift[k]) * 1000).toFixed(1);
    for (const line of filled[axis]) {
      const [i = 0, j = 0] = line.split(',').map(Number);
      for (const [di, dj] of NEIGHBOURS) {
        /** @type {Cell} */
        const [hi, hj] = [i + di, j + dj];
        if (!isFilled([hi, hj]) && NEIGHBOURS.every(([a, b]) => isFilled([hi + a, hj + b]))) {
          holes.add(`along ${'xyz'[axis]} at ${'xyz'[u]}=${at(hi, u)} ${'xyz'[v]}=${at(hj, v)} mm`);
        }
      }
    }
  }
  return [...holes].sort();
};

/**
 * Every hole in a model's voxel primitives, by mesh and grain.
 * @param {Buffer} glb
 * @returns {string[]}
 */
const voxelHoles = (glb) => {
  const gltf = glbJson(glb);
  const meshNames = new Map(gltf.nodes.flatMap((node) => (node.mesh === undefined ? [] : [[node.mesh, node.name]])));
  return gltf.meshes.flatMap((mesh, index) => {
    /** @type {Map<number, Triangle[]>} */
    const byGrain = new Map();
    for (const primitive of mesh.primitives) {
      const grain = primitive.extras?.voxelGrain;
      if (grain === undefined || primitive.mode !== 4 || primitive.indices === undefined) continue;
      const positions = glbAccessor(glb, gltf, primitive.attributes.POSITION);
      const indices = glbAccessor(glb, gltf, primitive.indices);
      const triangles = byGrain.get(grain) ?? [];
      byGrain.set(grain, triangles);
      /** @param {number} at */
      const vertex = (at) => /** @type {Point} */ (positions.slice(3 * (indices[at] ?? 0), 3 * (indices[at] ?? 0) + 3));
      for (let t = 0; t < indices.length; t += 3) triangles.push([vertex(t), vertex(t + 1), vertex(t + 2)]);
    }
    return [...byGrain].flatMap(([grain, triangles]) =>
      holesOf(triangles, grain).map((hole) => `${meshNames.get(index) ?? index} ${hole}`),
    );
  });
};

const tools = await recipeTools();
const rows = /** @type {{ id: string; kind: string }[]} */ (readRecipes().find(({ packId }) => packId === PACK)?.value);

for (const row of rows) {
  test(`${row.id} voxels leave no see-through line but its authored seams`, async () => {
    const [tool] = /** @type {['gun' | 'thing', ...unknown[]]} */ (
      Object.entries(tools)
        .filter(([, { kinds }]) => kinds.includes(row.kind))
        .map(([name]) => name)
    );
    const [task] = await tools[tool].tasks([row]);
    const { glb } = await generateRow({ tool, task });
    assert.deepEqual(voxelHoles(Buffer.from(glb)), AUTHORED_SEAMS[row.id] ?? []);
  });
}
