// A viewed row's data evaluated from its Jsonnet alone: Jsonnet is lazy, so keeping one row of the catalogue or of a
// recipe pays for that row, not for the thousands beside it. This is the one place that knows where a row comes from.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { evaluateJsonnetAsync } from '../../../jsonnet/index.mjs';
import type { RowResult, RowView } from '../src/live.ts';

const itemsSource = resolve(import.meta.dirname, '../items.jsonnet');
const recipes = resolve(import.meta.dirname, '../../../../models/recipes');

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
      `item: ${only(`(import ${JSON.stringify(itemsSource)}).items`, item)}`,
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
