// The review page: draws one model, assembled vehicle or kit assembly as a still tile of four views through the
// showcase's renderer, with a ground grid so size reads off the picture, since every view is fitted to its square. A
// vehicle's, an assembly's or a component model's tile adds its exploded view beside them, twice a view's size because its parts spread
// wider, so the parts a picture of the whole hides can be reviewed too; a wearable's adds itself worn on the doll at
// that size, so its fit reads beside the loose views. A look can ask for another set of views and for only some of a
// vehicle's sites (lookOptions.mjs). tools/model-sheet.mjs drives it headless through `window.look`; opened with
// `?id=a,b` it shows those tiles in the page, and `&views=` and `&sites=a,b` ask as the tool does. Its picker writes
// the ids it picks into `?id=`, and asked nothing the page shows a few of the day's models (lookOptions.mjs, lookedIds).
import * as THREE from 'three';
import { facingView } from './explode.mjs';
import { makeCombobox } from './combobox.mjs';
import { dailySeed, landingSeed } from './filter.mjs';
import { idSuggestions, keepSites, lookedIds, viewSet } from './lookOptions.mjs';
import { EXPLODED_VIEWS, FRONT_QUARTER } from './modelFrame.mjs';
import { comesApart, explodable, isVehicle, isWearable, loadEntry, registerModels, spread, stillInstance, wornEntry } from './render.mjs';
import { drawView, gridCell, groundGrid, makeDrawer, metres, ruleAt, startTile } from './tile.mjs';

let drawer;

const ready = (async () => {
  drawer = makeDrawer();
  const { models, vehicles, assemblies } = await fetch('models.json').then((r) => r.json());
  registerModels(models);
  // `landing` is what the showcase's landing page picks from, so a bare page opens on the index's own first models.
  return { byId: new Map([...models, ...vehicles, ...assemblies].map((entry) => [entry.id, entry])), landing: [...vehicles, ...models] };
})();

// One entry's tile, `size` pixels a view, as a PNG data URL, with what the sheet prints beside it. `views` names the
// view set and `sites` the site prefixes a vehicle or an assembly keeps (lookOptions.mjs).
async function look(id, size, { views = 'review', sites = [] } = {}) {
  const whole = (await ready).byId.get(id);
  if (!whole) throw new Error(`${id} is no model, vehicle or assembly of the built tree`);
  const entry = keepSites(whole, sites);
  const directions = viewSet(views).map(([name, direction]) => [name, new THREE.Vector3(...direction)]);
  const loaded = await loadEntry(entry);
  const obj = stillInstance(loaded, entry);
  const exploded = comesApart(entry);
  const worn = isWearable(entry);
  const wide = exploded || worn;
  const box = new THREE.Box3().setFromObject(obj);
  const extent = box.getSize(new THREE.Vector3());
  const cell = gridCell(Math.max(extent.x, extent.y, extent.z));
  const { tile, g } = startTile(size, wide ? 4 : 2, 2);
  const grid = groundGrid(box, cell);
  const { stage } = drawer;
  stage.add(obj);
  directions.forEach((view, i) => {
    drawView(drawer, g, obj, grid, view, (i % 2) * size, Math.floor(i / 2) * size, size);
  });
  if (exploded) {
    const parts = explodable(obj, entry);
    spread(parts, 1);
    const [name, direction] = facingView(parts.map(({ offset }) => offset.toArray()), EXPLODED_VIEWS);
    // The same cell as the assembled views, so the spread reads against the whole's own size.
    const apart = groundGrid(new THREE.Box3().setFromObject(obj), cell);
    drawView(drawer, g, obj, apart, [name, new THREE.Vector3(...direction)], size * 2, 0, size * 2);
  }
  stage.remove(obj);
  if (worn) {
    const dressed = stillInstance(await loadEntry(wornEntry(entry)), entry);
    const floor = new THREE.Box3().setFromObject(dressed);
    const under = groundGrid(floor, gridCell(Math.max(...floor.getSize(new THREE.Vector3()).toArray())));
    stage.add(dressed);
    drawView(drawer, g, dressed, under, ['worn front ¾', new THREE.Vector3(...FRONT_QUARTER)], size * 2, 0, size * 2);
    stage.remove(dressed);
  }
  ruleAt(g, { x: size }, tile.height);
  ruleAt(g, { y: size }, size * 2);
  if (wide) ruleAt(g, { x: size * 2 }, tile.height);
  return {
    png: tile.toDataURL('image/png'),
    sizeM: extent.toArray().map((v) => Math.round(v * 1000) / 1000),
    triangles: Math.round(loaded.triangles),
    parts: isVehicle(entry) ? entry.sites.length : entry.components?.length ?? 1,
    beside: exploded ? 'exploded' : worn ? 'worn' : null,
    materials: loaded.materials.map((m) => m.userData?.materialId ?? m.name),
    grid: metres(cell),
  };
}

window.look = look;

const SUGGESTION_LIMIT = 40; // ids the picker lists at once; typing narrows them

const query = new URLSearchParams(location.search);
const options = { views: query.get('views') ?? 'review', sites: query.get('sites')?.split(',') ?? [] };
const hint = Object.assign(document.createElement('p'), { textContent: 'A few of the day\'s models. Pick any to draw them instead.' });
const tiles = document.createElement('div');
// The page's static container: the deploy's footer follows it in the body, so content appended to the body would land below the footer.
const content = document.getElementById('content');

function drawTiles(asked, landing) {
  hint.hidden = asked.length > 0;
  tiles.replaceChildren(...lookedIds(asked, landing, landingSeed(dailySeed(), 0)).map((id) => {
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');
    caption.textContent = id;
    figure.append(caption);
    look(id, 384, options).then(
      ({ png, sizeM, triangles, grid, beside }) => {
        figure.classList.toggle('wide', Boolean(beside));
        figure.prepend(Object.assign(document.createElement('img'), { src: png, alt: `${id}, four views${beside ? ` and ${beside}` : ''}` }));
        caption.textContent = `${id} · ${sizeM.join(' × ')} m · ${triangles} triangles · grid ${grid}`;
      },
      (error) => { caption.textContent = `${id}: ${error.message}`; },
    );
    return figure;
  }));
}

// The picked ids replace `?id=` in place, so the address is always a link to the tiles the page shows.
function writeQuery(ids) {
  if (ids.length > 0) query.set('id', ids.join(','));
  else query.delete('id');
  const search = query.toString().replaceAll('%2C', ','); // a comma is safe in a query and reads better in a link
  history.replaceState(null, '', search ? `?${search}` : location.pathname);
}

ready.then(({ byId, landing }) => {
  const ids = [...byId.keys()].sort();
  let picked = query.get('id')?.split(',').filter(Boolean) ?? [];
  const picker = makeCombobox({
    label: 'Models',
    title: 'The models, vehicles and assemblies to draw.',
    textOf: (id) => id,
    suggest: (text) => idSuggestions(ids, text, picked, SUGGESTION_LIMIT).map((id) => ({ value: id, text: id })),
    onChange: (next) => {
      picked = next;
      writeQuery(picked);
      drawTiles(picked, landing);
    },
  });
  picker.set(picked);
  content.append(picker.element, hint, tiles);
  drawTiles(picked, landing);
});
