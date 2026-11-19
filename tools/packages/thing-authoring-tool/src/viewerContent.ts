// What the viewer lists: every recipe row, then the items no recipe exports yet, so a row under authoring can be seen
// before it has a recipe. The list holds ids only; an item is fetched when it is opened, since the page needs one of the
// thousands at a time and the dev server re-evaluates that one anyway.
import type { RecipeRow } from '@skelly/thing-export/recipe.ts';
import { ids as itemIds } from '../item-ids.json' with { type: 'json' };
import { loadItem, type ToolItem } from './catalogue.ts';
import { loadThingRecipe, THING_KINDS } from './exports.ts';
import { settings } from './settings.ts';

const recipeRows = (
  Object.values(
    import.meta.glob('../../../../models/recipes/*.json', { eager: true, import: 'default' }),
  ) as (readonly RecipeRow[])[]
)
  .flat()
  .filter(({ kind }) => THING_KINDS.includes(kind));
const exported = new Set(recipeRows.map(({ source }) => source));
const itemFiles = import.meta.glob('../items/*.json', { import: 'default' });

export interface Entry {
  readonly id: string;
  readonly label: string;
  /** The catalogue item it draws. */
  readonly source: string;
  readonly recipe?: RecipeRow;
}

/** An item and, where a recipe exports it, that recipe's row, both loaded and checked. */
export interface Shown {
  readonly item: ToolItem;
  readonly row?: ReturnType<typeof loadThingRecipe>[number];
}

export const entries: readonly Entry[] = [
  ...recipeRows.map((recipe) => ({ id: recipe.id, label: recipe.source, source: recipe.source, recipe })),
  ...itemIds.filter((id) => !exported.has(id)).map((id) => ({ id, label: id, source: id })),
];

/** What an item and its recipe row, neither yet checked, draw: as the refresh wrote them or as the server evaluated. */
export const shown = (item: unknown, recipe: unknown): Shown => {
  const loaded = loadItem(item, settings);
  const [row] = recipe === undefined ? [] : loadThingRecipe([recipe], { ...settings, items: [loaded] });
  return { item: loaded, ...(row ? { row } : {}) };
};

/** The entry's item as the refresh wrote it. */
export const readEntry = async ({ source, recipe }: Entry): Promise<Shown> => {
  const file = itemFiles[`../items/${source}.json`];
  if (file === undefined) throw new Error(`The catalogue has no row ${source}`);
  return shown(await file(), recipe);
};
