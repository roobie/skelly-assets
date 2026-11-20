// Drawing a review tile: a square of views of one object over a ground grid, so size reads off the picture. The review
// page (look.mjs) and the posing page (pose.mjs) both draw tiles through it, so a pose sheet reads like a model sheet.
import * as THREE from 'three';
import { OVERHEAD_SUN } from './modelFrame.mjs';
import { frame, makeStage, setupRenderer } from './render.mjs';

export const BACKGROUND = '#e8e6e1';
const RULE = '#9a958a';
const LABEL_INSET = 6;

// The overhead view's light: its sun strong over a dim room and sky, since at a few pixels a top surface reads as a
// shape only by the sun's shading across it, which the showcase's brighter fill would wash flat.
const OVERHEAD_LIGHT = { sunFrom: OVERHEAD_SUN, sun: 2.6, room: 0.25, sky: 0.2 };

// A renderer kept off screen with its stage and camera, which a page makes once it draws its first tile.
export function makeDrawer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  setupRenderer(renderer);
  return { renderer, stage: makeStage(renderer), camera: new THREE.PerspectiveCamera(30, 1, 0.01, 100) };
}

const labelPixels = (size) => Math.max(11, Math.round(size / 20));

// The largest power of ten no longer than the object's longest side, so a grid shows between one and ten cells.
export const gridCell = (longest) => 10 ** Math.floor(Math.log10(Math.max(longest, 1e-3)));

export function groundGrid(box, cell) {
  const size = box.getSize(new THREE.Vector3());
  const cells = Math.ceil(Math.max(size.x, size.z) / cell) + 2;
  const grid = new THREE.GridHelper(cells * cell, cells, 0x8c877c, 0xb9b4a9);
  grid.position.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  return grid;
}

export const metres = (cell) => (cell >= 1 ? `${cell} m` : `${Math.round(cell * 100)} cm`);

// A blank tile of `columns` × `rows` views, `size` pixels each, and its context with the view labels' font set.
export function startTile(size, columns, rows) {
  const tile = document.createElement('canvas');
  tile.width = size * columns;
  tile.height = size * rows;
  const g = tile.getContext('2d');
  g.fillStyle = BACKGROUND;
  g.fillRect(0, 0, tile.width, tile.height);
  g.font = `${labelPixels(size)}px sans-serif`;
  g.textBaseline = 'top';
  return { tile, g };
}

// A hairline between views at x or at y, `length` long from `start`.
export function ruleAt(g, { x, y }, length, start = 0) {
  g.fillStyle = RULE;
  if (x !== undefined) g.fillRect(x, start, 1, length);
  else g.fillRect(start, y, length, 1);
}

// Draws the stage from `direction` into `size` pixels of the tile at (x, y), framed on `framed`, with the view's name,
// over `grid` when the view looks from level or above: from below, the grid would lie between the camera and the object.
export function drawView({ renderer, stage, camera }, g, framed, grid, [name, direction], x, y, size) {
  renderer.setSize(size, size, false);
  frame(camera, framed, new THREE.Vector3(), direction);
  const gridded = direction.y >= 0;
  if (gridded) stage.add(grid);
  renderer.render(stage, camera);
  if (gridded) stage.remove(grid);
  g.drawImage(renderer.domElement, x, y);
  labelView(g, name, x, y);
}

function labelView(g, name, x, y) {
  g.fillStyle = '#5b574f';
  g.fillText(name, x + LABEL_INSET, y + LABEL_INSET);
}

// The share of a figure's height the overhead view's square spans: a standing figure's footprint, arms and a pack
// included, fits inside half its height, and a tighter square leaves its pixels room to be enlarged.
const OVERHEAD_SPAN = 0.5;
const overheadSide = (pixels) => Math.ceil(pixels * OVERHEAD_SPAN);

// The whole number of times the overhead view of a figure `pixels` tall is enlarged to fit a view of `size` pixels
// below its label, so views of several sizes drawn by the same scale keep their sizes' ratio. A view too small to
// hold it at its real size is refused, as it would draw blank.
export function overheadScale(size, pixels) {
  const scale = Math.floor((size - labelPixels(size) - 2 * LABEL_INSET) / overheadSide(pixels));
  if (scale < 1)
    throw new Error(`a view of ${size} px is too small for an overhead view of a figure ${pixels} px tall`);
  return scale;
}

// Draws `framed` straight down, as a top-down game's camera sees it, at `pixels` to the figure's `tall` metres, over a
// square its footprint fits inside centred on it. It is drawn at that real size and enlarged `scale` times without
// smoothing into the view of `size` pixels at (x, y), so a reviewer sees each pixel a game would draw. Front is down,
// as in the review views' top. The view has a stage of its own, lit for it, which the drawer makes on its first use.
export function drawOverhead(drawer, g, framed, { name, tall, pixels, scale }, x, y, size) {
  const { renderer } = drawer;
  drawer.overhead ??= { stage: makeStage(renderer, OVERHEAD_LIGHT), camera: new THREE.OrthographicCamera() };
  const { stage, camera } = drawer.overhead;
  const side = overheadSide(pixels);
  renderer.setSize(side, side, false);
  const box = new THREE.Box3().setFromObject(framed);
  const centre = box.getCenter(new THREE.Vector3());
  const half = ((side / pixels) * tall) / 2;
  const above = 1; // metres over the figure's top, so nothing of it lies behind the camera
  Object.assign(camera, {
    left: -half,
    right: half,
    top: half,
    bottom: -half,
    near: above / 2,
    far: above + box.max.y - box.min.y + 1,
  });
  camera.position.set(centre.x, box.max.y + above, centre.z);
  camera.up.set(0, 0, -1);
  camera.lookAt(centre.x, box.min.y, centre.z);
  camera.updateProjectionMatrix();
  stage.add(framed);
  renderer.render(stage, camera);
  stage.remove(framed);
  const shown = side * scale;
  g.imageSmoothingEnabled = false;
  g.drawImage(renderer.domElement, x + (size - shown) / 2, y + size - shown - LABEL_INSET, shown, shown);
  g.imageSmoothingEnabled = true;
  labelView(g, name, x, y);
}

// Draws the stage as seen from `eye` looking along `forward` into `size` pixels of the tile at (x, y): a first-person
// view, wide like a game's and framed on nothing, with the view's name.
const EYE_FOV = 70;
export function drawEye({ renderer, stage, camera }, g, name, eye, forward, x, y, size) {
  renderer.setSize(size, size, false);
  camera.fov = EYE_FOV;
  camera.near = 0.02;
  camera.far = 100;
  camera.up.set(0, 1, 0);
  camera.position.copy(eye);
  camera.lookAt(eye.clone().add(forward));
  camera.updateProjectionMatrix();
  renderer.render(stage, camera);
  camera.fov = 30;
  g.drawImage(renderer.domElement, x, y);
  labelView(g, name, x, y);
}
