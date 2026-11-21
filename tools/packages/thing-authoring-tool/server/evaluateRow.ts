// A viewed row's data evaluated from the one file that holds it. Finding a row by its id reads every row's id, and a
// row is built before its id can be read, so picking it out of the whole catalogue would build the thousands beside it
// and fail on any one of them. This is the one place that knows where a row comes from.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { evaluateJsonnetAsync } from '../../../jsonnet/index.mjs';
import { type CatalogueManifest, rowFileOf } from '../src/catalogueManifest.ts';
import type { RowResult, RowView } from '../src/live.ts';

const repository = resolve(import.meta.dirname, '../../../..');
const manifest = resolve(import.meta.dirname, '../item-ids.json');
const recipes = join(repository, 'models/recipes');

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

// The catalogue is its row files' rows, so the row file that holds an item makes the same row the catalogue does. The
// manifest is read afresh, since a refresh while the server runs may move a row to another file.
const catalogueSource = (itemId: string) =>
  join(repository, rowFileOf(JSON.parse(readFileSync(manifest, 'utf8')) as CatalogueManifest, itemId));

// The recipe file of each row, read from the twins, which hold every row id and which the dev server's start made
// current; a row added to a recipe later is found at the next start.
let recipeOf: ReadonlyMap<string, string> | undefined;
const recipeSource = (rowId: string) => {
  recipeOf ??= new Map(
    readdirSync(recipes)
      .filter((name) => name.endsWith('.json'))
      .flatMap((name) =>
        (JSON.parse(readFileSync(join(recipes, name), 'utf8')) as readonly { id: string }[]).map(
          ({ id }) => [id, join(recipes, name.replace(/\.json$/, '.jsonnet'))] as const,
        ),
      ),
  );
  const source = recipeOf.get(rowId);
  if (source === undefined) throw new Error(`No recipe file holds row ${rowId}`);
  return source;
};

const only = (rows: string, id: string) => `only(${rows}, ${JSON.stringify(id)})`;

// One expression, so one process: the item and its row evaluate together or fail together.
export const evaluateRow = async ({ item, row }: RowView): Promise<RowResult> => {
  try {
    const fields = [
      `item: ${only(`import ${JSON.stringify(catalogueSource(item))}`, item)}`,
      ...(row === undefined ? [] : [`row: ${only(`import ${JSON.stringify(recipeSource(row))}`, row)}`]),
    ];
    const expression = `
      local only(rows, id) =
        local found = [x for x in rows if x.id == id];
        assert std.length(found) == 1 : 'Expected one row ' + id + ', found ' + std.length(found);
        found[0];
      { ${fields.join(', ')} }`;
    return JSON.parse(await evaluateJsonnetAsync(expression, undefined, { label: `row ${item}` }));
  } catch (error) {
    return { error: message(error) };
  }
};
