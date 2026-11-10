// The review page: draws one model, assembled vehicle or kit assembly as a still tile of four views through the
// showcase's renderer, with a ground grid so size reads off the picture, since every view is fitted to its square. A
// vehicle's or an assembly's tile adds its exploded view beside them, twice a view's size because its parts spread
// wider, so the parts a picture of the whole hides can be reviewed too; a wearable's adds itself worn on the doll at
// that size, so its fit reads beside the loose views. tools/model-sheet.mjs drives it headless
// through `window.look`; opened with `?id=a,b` it shows those tiles in the page.
import * as THREE from 'three';
import { facingView } from './explode.mjs';
import { EXPLODED_VIEWS, FRONT_QUARTER, REVIEW_VIEWS } from './modelFrame.mjs';
import { explodable, frame, isVehicle, isWearable, loadEntry, makeStage, registerModels, setupRenderer, spread, stillInstance, wornEntry } from './render.mjs';

const views = REVIEW_VIEWS.map(([name, direction]) => [name, new THREE.Vector3(...direction)]);
const BACKGROUND = '#e8e6e1';

let renderer;
let stage;
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

const ready = (async () => {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  setupRenderer(renderer);
  stage = makeStage(renderer);
  const { models, vehicles, assemblies } = await fetch('models.json').then((r) => r.json());
  registerModels(models);
  return new Map([...models, ...vehicles, ...assemblies].map((entry) => [entry.id, entry]));
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

// Draws the object from `direction` into `size` pixels of the tile at (x, y), with the view's name.
function drawView(g, obj, [name, direction], x, y, size) {
  renderer.setSize(size, size, false);
  frame(camera, obj, new THREE.Vector3(), direction);
  renderer.render(stage, camera);
  g.drawImage(renderer.domElement, x, y);
  g.fillStyle = '#5b574f';
  g.fillText(name, x + 6, y + 6);
}

// One entry's tile, `size` pixels a view, as a PNG data URL, with what the sheet prints beside it.
async function look(id, size) {
  const entries = await ready;
  const entry = entries.get(id);
  if (!entry) throw new Error(`${id} is no model, vehicle or assembly of the built tree`);
  const loaded = await loadEntry(entry);
  const obj = stillInstance(loaded, entry);
  const exploded = isVehicle(entry);
  const worn = isWearable(entry);
  const wide = exploded || worn;
  const box = new THREE.Box3().setFromObject(obj);
  const extent = box.getSize(new THREE.Vector3());
  const cell = gridCell(Math.max(extent.x, extent.y, extent.z));
  const tile = document.createElement('canvas');
  tile.width = size * (wide ? 4 : 2);
  tile.height = size * 2;
  const g = tile.getContext('2d');
  g.fillStyle = BACKGROUND;
  g.fillRect(0, 0, tile.width, tile.height);
  g.font = `${Math.max(11, Math.round(size / 20))}px sans-serif`;
  g.textBaseline = 'top';
  const grid = groundGrid(box, cell);
  stage.add(obj, grid);
  views.forEach((view, i) => {
    drawView(g, obj, view, (i % 2) * size, Math.floor(i / 2) * size, size);
  });
  stage.remove(grid);
  if (exploded) {
    const parts = explodable(obj);
    spread(parts, 1);
    const [name, direction] = facingView(parts.map(({ offset }) => offset.toArray()), EXPLODED_VIEWS);
    // The same cell as the assembled views, so the spread reads against the whole's own size.
    const apart = groundGrid(new THREE.Box3().setFromObject(obj), cell);
    stage.add(apart);
    drawView(g, obj, [name, new THREE.Vector3(...direction)], size * 2, 0, size * 2);
    stage.remove(apart);
  }
  stage.remove(obj);
  if (worn) {
    const dressed = stillInstance(await loadEntry(wornEntry(entry)), entry);
    const floor = new THREE.Box3().setFromObject(dressed);
    const under = groundGrid(floor, gridCell(Math.max(...floor.getSize(new THREE.Vector3()).toArray())));
    stage.add(dressed, under);
    drawView(g, dressed, ['worn front ¾', new THREE.Vector3(...FRONT_QUARTER)], size * 2, 0, size * 2);
    stage.remove(dressed, under);
  }
  g.fillStyle = '#9a958a';
  g.fillRect(size, 0, 1, tile.height);
  g.fillRect(0, size, size * 2, 1);
  if (wide) g.fillRect(size * 2, 0, 1, tile.height);
  return {
    png: tile.toDataURL('image/png'),
    sizeM: extent.toArray().map((v) => Math.round(v * 1000) / 1000),
    triangles: Math.round(loaded.triangles),
    parts: isVehicle(entry) ? entry.sites.length : 1,
    beside: exploded ? 'exploded' : worn ? 'worn' : null,
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
      ({ png, sizeM, triangles, grid, beside }) => {
        figure.classList.toggle('wide', Boolean(beside));
        figure.prepend(Object.assign(document.createElement('img'), { src: png, alt: `${id}, four views${beside ? ` and ${beside}` : ''}` }));
        caption.textContent = `${id} · ${sizeM.join(' × ')} m · ${triangles} triangles · grid ${grid}`;
      },
      (error) => { caption.textContent = `${id}: ${error.message}`; },
    );
  }
}
