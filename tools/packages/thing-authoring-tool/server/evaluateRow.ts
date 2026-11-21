// A viewed row's data evaluated from the one file that holds it. Finding a row by its id reads every row's id, and a
// row is built before its id can be read, so picking it out of the whole catalogue would build the thousands beside it
// and fail on any one of them. This is the one place that knows where a row comes from.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { evaluateJsonnetAsync } from '../../../jsonnet/index.mjs';
import { type CatalogueManifest, rowFileOf } from '../src/catalogueManifest.ts';
import type { Half, HalfResult } from '../src/live.ts';

const repository = resolve(import.meta.dirname, '../../../..');
const manifest = resolve(import.meta.dirname, '../item-ids.json');
const recipes = join(repository, 'models/recipes');

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const importOf = (path: string) => `import ${JSON.stringify(path)}`;
const catalogue = importOf(join(repository, 'models/index.libsonnet'));

// The catalogue is its row files' rows, so the row file that holds an item makes the same row the catalogue does. The
// manifest names that file as of the last refresh, which may run beside the server, so it is read afresh; a row moved
// to another file or added since that refresh is found in the whole catalogue, slowly but rightly.
const catalogueRows = (itemId: string) => {
  const file = rowFileOf(JSON.parse(readFileSync(manifest, 'utf8')) as CatalogueManifest, itemId);
  if (file === undefined) return catalogue;
  const own = importOf(join(repository, file));
  return `(if std.member([x.id for x in ${own}], ${JSON.stringify(itemId)}) then ${own} else ${catalogue})`;
};

// The recipe file of each row, read from the twins, which hold every row id and which the dev server's start made
// current; a row added to a recipe later is found at the next start.
let recipeOf: ReadonlyMap<string, string> | undefined;
const recipeRows = (rowId: string) => {
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
  return importOf(source);
};

// Each half's rows that hold an id, as Jsonnet.
const rowsOf: Readonly<Record<Half, (id: string) => string>> = { item: catalogueRows, row: recipeRows };

// Each half in a process of its own, so the item draws without waiting on its recipe row, or failing with it.
export const evaluateHalf = async (half: Half, id: string): Promise<HalfResult> => {
  try {
    const expression = `
      local found = [x for x in ${rowsOf[half](id)} if x.id == ${JSON.stringify(id)}];
      assert std.length(found) == 1 : ${JSON.stringify(`Expected one row ${id}, found `)} + std.length(found);
      found[0]`;
    return { value: JSON.parse(await evaluateJsonnetAsync(expression, undefined, { label: `${half} ${id}` })) };
  } catch (error) {
    return { error: message(error) };
  }
};
