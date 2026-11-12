// Drawing a review tile: a square of views of one object over a ground grid, so size reads off the picture. The review
// page (look.mjs) and the posing page (pose.mjs) both draw tiles through it, so a pose sheet reads like a model sheet.
import * as THREE from 'three';
import { frame, makeStage, setupRenderer } from './render.mjs';

export const BACKGROUND = '#e8e6e1';
const RULE = '#9a958a';

// A renderer kept off screen with its stage and camera, which a page makes once it draws its first tile.
export function makeDrawer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  setupRenderer(renderer);
  return { renderer, stage: makeStage(renderer), camera: new THREE.PerspectiveCamera(30, 1, 0.01, 100) };
}

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
  g.font = `${Math.max(11, Math.round(size / 20))}px sans-serif`;
  g.textBaseline = 'top';
  return { tile, g };
}

// A hairline between views at x or at y.
export function ruleAt(g, { x, y }, length) {
  g.fillStyle = RULE;
  if (x !== undefined) g.fillRect(x, 0, 1, length);
  else g.fillRect(0, y, length, 1);
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
  g.fillStyle = '#5b574f';
  g.fillText(name, x + 6, y + 6);
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
  g.fillStyle = '#5b574f';
  g.fillText(name, x + 6, y + 6);
}
