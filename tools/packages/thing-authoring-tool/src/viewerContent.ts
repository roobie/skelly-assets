// What the viewer lists: every recipe row, then the items no recipe exports yet, so a row under authoring can be seen
// before it has a recipe. The list holds ids only; an item is fetched when it is opened, since the page needs one of the
// thousands at a time and the dev server re-evaluates that one anyway.
import type { RecipeRow } from '@skelly/thing-export/recipe.ts';
import manifest from '../item-ids.json' with { type: 'json' };
import { loadItem, type ToolItem } from './catalogue.ts';
import { catalogueIds } from './catalogueManifest.ts';
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

export const entries: readonly Entry[] = [
  ...recipeRows.map((recipe) => ({ id: recipe.id, label: recipe.source, source: recipe.source, recipe })),
  ...catalogueIds(manifest)
    .filter((id) => !exported.has(id))
    .map((id) => ({ id, label: id, source: id })),
];

/**
 * An item as the refresh wrote it or as the server evaluated it, checked on its own, since it draws the model without
 * its recipe row.
 */
export const checkItem = (item: unknown): ToolItem => loadItem(item, settings);

/** A recipe row as the refresh wrote it or as the server evaluated it, checked against the item it exports. */
export const checkRow = (item: ToolItem, row: unknown) => {
  const [checked] = loadThingRecipe([row], { ...settings, items: [item] });
  return checked!;
};

/** The entry's item as the refresh wrote it. */
export const readItem = async ({ source }: Entry): Promise<unknown> => {
  const file = itemFiles[`../items/${source}.json`];
  if (file === undefined) throw new Error(`The catalogue has no row ${source}`);
  return file();
};
