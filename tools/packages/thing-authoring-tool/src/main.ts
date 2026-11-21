import { recipeAsset } from '@skelly/thing-export/recipe.ts';
import { createPreview } from '@skelly/tool-ui/preview';
import { buildLayers, disposeGroup } from '@skelly/tool-ui/scene';
import { threeRuntime } from '@skelly/tool-ui/three-runtime';
import type { Group } from 'three';
import { buildItem, itemPalette, type ToolItem } from './catalogue.ts';
import { exportItem } from './exports.ts';
import { type Half, type HalfResult, LIVE_ROW, LIVE_VIEW, type RowMessage, type RowView, viewKey } from './live.ts';
import { settings } from './settings.ts';
import { checkItem, checkRow, type Entry, entries, readItem } from './viewerContent.ts';

// The selected row is the page's address, so a reload or a shared link lands on the same row.
const ITEM_PARAM = 'item';

const select = document.querySelector<HTMLSelectElement>('#item')!;
const preview = createPreview(document.querySelector<HTMLCanvasElement>('#view')!);
const compileError = document.querySelector<HTMLPreElement>('#compile-error')!;
const rowError = document.querySelector<HTMLPreElement>('#row-error')!;
const drawError = document.querySelector<HTMLPreElement>('#error')!;
let drawn: Group | undefined;
// The viewed row's halves: the item the drawn model was built from, and the recipe row as it last arrived, unchecked
// until it meets that item, which only says where the model balances.
let item: ToolItem | undefined;
let row: unknown;
// Whether the camera has been framed on the viewed row, and turned about its balance point: a redraw of the row leaves
// the camera where the author put it.
let framed = false;
let centred = false;

const message = (failure: unknown) => (failure instanceof Error ? failure.message : String(failure));
const fail = (element: HTMLPreElement, failure: unknown) => {
  element.textContent = message(failure);
  element.hidden = false;
};

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
  item = undefined;
  row = undefined;
  framed = false;
  centred = false;
  for (const error of [compileError, rowError, drawError]) error.hidden = true;
};

/** Whether the item drew; one that did not keeps the model before it, which the row goes on placing. */
const drawItem = (shown: ToolItem) => {
  try {
    const { report } = buildItem(shown, settings);
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
    if (!framed) preview.frame(drawn);
    framed = true;
    drawError.hidden = true;
    return true;
  } catch (failure) {
    fail(drawError, failure);
    return false;
  }
};

// Only a recipe says how the item is voxelled, so only a recipe row has an export to take the balance point from. A row
// that fails leaves the model drawn beside its error. It arrives seconds after the model, so the camera keeps whatever
// view the author has turned to meanwhile and only comes to turn about the balance point.
const placeRow = () => {
  if (item === undefined || row === undefined) return;
  try {
    const checked = checkRow(item, row);
    const { centreOfMass } = exportItem(item, settings, recipeAsset(checked), checked.voxel).physical;
    if (!centred) preview.orbitAbout(centreOfMass);
    centred = true;
    rowError.hidden = true;
  } catch (failure) {
    fail(rowError, failure);
  }
};

const receive: Readonly<Record<Half, (result: HalfResult) => void>> = {
  item: (result) => {
    let checked: ToolItem;
    try {
      if ('error' in result) throw new Error(result.error);
      checked = checkItem(result.value);
      compileError.hidden = true;
    } catch (failure) {
      fail(compileError, failure);
      return;
    }
    if (!drawItem(checked)) return;
    item = checked;
    placeRow();
  },
  // A row that failed has nothing to place, so a later item must not clear its error with the row before it.
  row: (result) => {
    if ('error' in result) {
      row = undefined;
      fail(rowError, result.error);
      return;
    }
    row = result.value;
    rowError.hidden = true;
    placeRow();
  },
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
    void readItem(entry)
      .then(
        (value): HalfResult => ({ value }),
        (failure): HalfResult => ({ error: message(failure) }),
      )
      .then((result) => {
        if (selected() !== entry) return;
        receive.item(result);
        if (entry.recipe) receive.row({ value: entry.recipe });
      });
};

select.replaceChildren(...entries.map(({ id, label }) => new Option(label, id)));
select.value = new URLSearchParams(location.search).get(ITEM_PARAM) ?? '';
if (select.selectedIndex < 0) select.selectedIndex = 0;
select.addEventListener('change', open);
open();

// A half answers the view it was asked for, which the page may have left, so a slow recipe row cannot land on another.
import.meta.hot?.on(LIVE_ROW, ({ view, half, result }: RowMessage) => {
  if (viewKey(view) === viewKey(viewOf(selected()))) receive[half](result);
});
