// What the viewer lists, from the twins made when it started: every recipe row with its item, then the items no recipe
// exports yet, so a row under authoring can be seen before it has a recipe. The dev server re-evaluates the viewed row.
import { catalogue } from './content.ts';
import { loadThingRecipeFiles } from './exports.ts';

const rows = loadThingRecipeFiles(
  Object.values(import.meta.glob('../../../../models/recipes/*.json', { eager: true, import: 'default' })),
  catalogue,
);
const exported = new Set(rows.map(({ source }) => source));

export interface Entry {
  readonly id: string;
  readonly label: string;
  readonly item: (typeof catalogue.items)[number];
  readonly row?: (typeof rows)[number];
}

export const entries: readonly Entry[] = [
  ...rows.map((row) => ({
    id: row.id,
    label: row.source,
    item: catalogue.items.find(({ id }) => id === row.source)!,
    row,
  })),
  ...catalogue.items.filter(({ id }) => !exported.has(id)).map((item) => ({ id: item.id, label: item.id, item })),
];
