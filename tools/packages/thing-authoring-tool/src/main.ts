import { recipeAsset } from '@skelly/thing-export/recipe.ts';
import { createPreview } from '@skelly/tool-ui/preview';
import { buildLayers, disposeGroup } from '@skelly/tool-ui/scene';
import { threeRuntime } from '@skelly/tool-ui/three-runtime';
import type { Group } from 'three';
import { buildItem, itemPalette } from './catalogue.ts';
import { exportItem } from './exports.ts';
import { LIVE_EVENT, LIVE_READY, type LiveStatus } from './live.ts';
import * as initial from './viewerContent.ts';

// The selected row is the page's address, so a reload or a shared link lands on the same row.
const ITEM_PARAM = 'item';

const select = document.querySelector<HTMLSelectElement>('#item')!;
const preview = createPreview(document.querySelector<HTMLCanvasElement>('#view')!);
let { catalogue, entries } = initial;
let drawn: Group | undefined;

const fill = (wanted: string | null) => {
  select.replaceChildren(...entries.map(({ id, label }) => new Option(label, id)));
  select.value = wanted ?? '';
  if (select.selectedIndex < 0) select.selectedIndex = 0;
};

// A redraw of the row already framed leaves the camera where the author put it.
const show = (reframe: boolean) => {
  const error = document.querySelector<HTMLPreElement>('#error')!;
  try {
    const { item, row } = entries.find(({ id }) => id === select.value)!;
    const { report } = buildItem(item, catalogue);
    // Only a recipe says how the item is voxelled, so only a recipe row has an export to take the balance point from.
    const centre = row && exportItem(item, catalogue, recipeAsset(row), row.voxel).physical.centreOfMass;
    const layers = buildLayers(
      report,
      [],
      itemPalette(catalogue),
      threeRuntime,
      { origin: [0, 0, 0], dir: [0, 1, 0] },
      'finish',
      {},
      catalogue.facets,
    );
    if (drawn) {
      preview.scene.remove(drawn);
      disposeGroup(drawn);
    }
    drawn = layers.solids;
    for (const unused of [layers.axes, layers.ports, layers.keepOuts]) {
      disposeGroup(unused);
    }
    preview.scene.add(drawn);
    if (reframe) preview.frame(drawn, centre);
    error.hidden = true;
  } catch (failure) {
    error.textContent = failure instanceof Error ? failure.message : String(failure);
    error.hidden = false;
  }
};

fill(new URLSearchParams(location.search).get(ITEM_PARAM));
select.addEventListener('change', () => {
  history.replaceState(undefined, '', `?${new URLSearchParams({ [ITEM_PARAM]: select.value })}`);
  show(true);
});
show(true);

if (import.meta.hot) {
  // New content is a new module graph under this one, so the page stays and only the drawing is redone.
  import.meta.hot.accept('./viewerContent.ts', (next) => {
    if (!next) return;
    const previous = select.value;
    ({ catalogue, entries } = next);
    fill(previous);
    show(select.value !== previous);
  });
  const compileError = document.querySelector<HTMLPreElement>('#compile-error')!;
  import.meta.hot.on(LIVE_EVENT, ({ error }: LiveStatus) => {
    compileError.textContent = error ?? '';
    compileError.hidden = error === undefined;
  });
  import.meta.hot.send(LIVE_READY);
}
