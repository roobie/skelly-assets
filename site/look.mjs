// The review page: draws one model or assembled vehicle as a still tile of four views through the showcase's renderer,
// with a ground grid so size reads off the picture, since every view is fitted to its square. tools/model-sheet.mjs
// drives it headless through `window.look`; opened with `?id=a,b` it shows those tiles in the page.
import * as THREE from 'three';
import { frame, isVehicle, loadEntry, makeStage, registerModels, setupRenderer, stillInstance, VIEW_DIR } from './render.mjs';

// A side view looks across the model's longer horizontal side, so it shows a profile whichever way the model lies.
const views = (extent) => [
  ['front ¾', VIEW_DIR],
  ['rear ¾', new THREE.Vector3(-VIEW_DIR.x, VIEW_DIR.y, -VIEW_DIR.z)],
  ['side', extent.x >= extent.z ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)],
  ['top', new THREE.Vector3(0, 1, 0)],
];
const BACKGROUND = '#e8e6e1';

let renderer;
let stage;
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

const ready = (async () => {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  setupRenderer(renderer);
  stage = makeStage(renderer);
  const { models, vehicles } = await fetch('models.json').then((r) => r.json());
  registerModels(models);
  return new Map([...models, ...vehicles].map((entry) => [entry.id, entry]));
})();

// The largest power of ten no longer than the model's longest side, so a grid shows between one and ten cells.
const gridCell = (longest) => 10 ** Math.floor(Math.log10(Math.max(longest, 1e-3)));

function groundGrid(box, cell) {
  const size = box.getSize(new THREE.Vector3());
  const cells = Math.ceil(Math.max(size.x, size.z) / cell) + 2;
  const grid = new THREE.GridHelper(cells * cell, cells, 0x8c877c, 0xb9b4a9);
  grid.position.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  return grid;
}

const metres = (cell) => (cell >= 1 ? `${cell} m` : `${Math.round(cell * 100)} cm`);

// One entry's tile, `size` pixels a view, as a PNG data URL, with what the sheet prints beside it.
async function look(id, size) {
  const entries = await ready;
  const entry = entries.get(id);
  if (!entry) throw new Error(`${id} is neither a model nor a vehicle of the built tree`);
  const loaded = await loadEntry(entry);
  const obj = stillInstance(loaded, entry);
  const box = new THREE.Box3().setFromObject(obj);
  const extent = box.getSize(new THREE.Vector3());
  const cell = gridCell(Math.max(extent.x, extent.y, extent.z));
  const grid = groundGrid(box, cell);
  stage.add(obj, grid);
  renderer.setSize(size, size, false);
  const tile = document.createElement('canvas');
  tile.width = tile.height = size * 2;
  const g = tile.getContext('2d');
  g.fillStyle = BACKGROUND;
  g.fillRect(0, 0, tile.width, tile.height);
  g.font = `${Math.max(11, Math.round(size / 20))}px sans-serif`;
  g.textBaseline = 'top';
  views(extent).forEach(([name, direction], i) => {
    frame(camera, obj, new THREE.Vector3(), direction);
    renderer.render(stage, camera);
    const x = (i % 2) * size;
    const y = Math.floor(i / 2) * size;
    g.drawImage(renderer.domElement, x, y);
    g.fillStyle = '#5b574f';
    g.fillText(name, x + 6, y + 6);
  });
  stage.remove(obj, grid);
  g.fillStyle = '#9a958a';
  g.fillRect(size, 0, 1, tile.height);
  g.fillRect(0, size, tile.width, 1);
  return {
    png: tile.toDataURL('image/png'),
    sizeM: extent.toArray().map((v) => Math.round(v * 1000) / 1000),
    triangles: Math.round(loaded.triangles),
    parts: isVehicle(entry) ? entry.sites.length : 1,
    materials: loaded.materials.map((m) => m.userData?.materialId ?? m.name),
    grid: metres(cell),
  };
}

window.look = look;

const asked = new URLSearchParams(location.search).get('id');
if (asked) {
  for (const id of asked.split(',')) {
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');
    caption.textContent = id;
    figure.append(caption);
    document.body.append(figure);
    look(id, 384).then(
      ({ png, sizeM, triangles, grid }) => {
        figure.prepend(Object.assign(document.createElement('img'), { src: png, alt: `${id}, four views` }));
        caption.textContent = `${id} · ${sizeM.join(' × ')} m · ${triangles} triangles · grid ${grid}`;
      },
      (error) => { caption.textContent = `${id}: ${error.message}`; },
    );
  }
}
