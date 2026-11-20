import { recipeAsset } from '@skelly/thing-export/recipe.ts';
import { createPreview } from '@skelly/tool-ui/preview';
import { buildLayers, disposeGroup } from '@skelly/tool-ui/scene';
import { threeRuntime } from '@skelly/tool-ui/three-runtime';
import type { Group } from 'three';
import { buildItem, itemPalette } from './catalogue.ts';
import { exportItem } from './exports.ts';
import { LIVE_ROW, LIVE_VIEW, type RowMessage, type RowView, viewKey } from './live.ts';
import { settings } from './settings.ts';
import { type Entry, entries, readEntry, type Shown, shown } from './viewerContent.ts';

// The selected row is the page's address, so a reload or a shared link lands on the same row.
const ITEM_PARAM = 'item';

const select = document.querySelector<HTMLSelectElement>('#item')!;
const preview = createPreview(document.querySelector<HTMLCanvasElement>('#view')!);
const compileError = document.querySelector<HTMLPreElement>('#compile-error')!;
const drawError = document.querySelector<HTMLPreElement>('#error')!;
let drawn: Group | undefined;
// The row the camera was last framed on: a redraw of that row leaves the camera where the author put it.
let framed: string | undefined;

const message = (failure: unknown) => (failure instanceof Error ? failure.message : String(failure));

// Another row's model and error must not stand under this one's name while it waits to be evaluated.
const undraw = () => {
  if (drawn) {
    preview.scene.remove(drawn);
    disposeGroup(drawn);
    drawn = undefined;
  }
};
const clear = () => {
  undraw();
  compileError.hidden = true;
  drawError.hidden = true;
};

const draw = (id: string, { item, row }: Shown) => {
  try {
    const { report } = buildItem(item, settings);
    // Only a recipe says how the item is voxelled, so only a recipe row has an export to take the balance point from.
    const centre = row && exportItem(item, settings, recipeAsset(row), row.voxel).physical.centreOfMass;
    const layers = buildLayers(
      report,
      [],
      itemPalette(settings),
      threeRuntime,
      { origin: [0, 0, 0], dir: [0, 1, 0] },
      'finish',
      {},
      settings.facets,
    );
    undraw();
    drawn = layers.solids;
    for (const unused of [layers.axes, layers.ports, layers.keepOuts]) {
      disposeGroup(unused);
    }
    preview.scene.add(drawn);
    if (framed !== id) preview.frame(drawn, centre);
    framed = id;
    drawError.hidden = true;
  } catch (failure) {
    drawError.textContent = message(failure);
    drawError.hidden = false;
  }
};

const selected = () => entries.find(({ id }) => id === select.value)!;
const viewOf = ({ source, recipe }: Entry): RowView => ({ item: source, row: recipe?.id });

const open = () => {
  const entry = selected();
  clear();
  history.replaceState(undefined, '', `?${new URLSearchParams({ [ITEM_PARAM]: entry.id })}`);
  // Under the dev server the Jsonnet may have changed since the row's file was written, so the row is drawn only once
  // the server has evaluated it; a built page has nothing newer.
  if (import.meta.hot) import.meta.hot.send(LIVE_VIEW, viewOf(entry));
  else
    readEntry(entry).then(
      (row) => selected() === entry && draw(entry.id, row),
      (failure) => {
        if (selected() !== entry) return;
        drawError.textContent = message(failure);
        drawError.hidden = false;
      },
    );
};

select.replaceChildren(...entries.map(({ id, label }) => new Option(label, id)));
select.value = new URLSearchParams(location.search).get(ITEM_PARAM) ?? '';
if (select.selectedIndex < 0) select.selectedIndex = 0;
select.addEventListener('change', open);
open();

import.meta.hot?.on(LIVE_ROW, ({ view, result }: RowMessage) => {
  const entry = selected();
  if (viewKey(view) !== viewKey(viewOf(entry))) return;
  try {
    if ('error' in result) throw new Error(result.error);
    const fresh = shown(result.item, result.row);
    compileError.hidden = true;
    draw(entry.id, fresh);
  } catch (failure) {
    compileError.textContent = message(failure);
    compileError.hidden = false;
  }
});
