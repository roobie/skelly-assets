// A viewed row's data evaluated from its Jsonnet alone: Jsonnet is lazy, so keeping one row of the catalogue or of a
// recipe pays for that row, not for the thousands beside it. This is the one place that knows where a row comes from.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { evaluateJsonnetAsync } from '../../../jsonnet/index.mjs';
import type { RowResult, RowView } from '../src/live.ts';

const itemsSource = resolve(import.meta.dirname, '../items.jsonnet');
const recipes = resolve(import.meta.dirname, '../../../../models/recipes');

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

// The recipe files are found in their twins, which hold every row id and which the dev server's start has made current.
const recipeSource = (rowId: string) => {
  const twin = readdirSync(recipes)
    .filter((name) => name.endsWith('.json'))
    .find((name) =>
      (JSON.parse(readFileSync(join(recipes, name), 'utf8')) as readonly { id: string }[]).some(
        ({ id }) => id === rowId,
      ),
    );
  if (twin === undefined) throw new Error(`No recipe file holds row ${rowId}`);
  return join(recipes, twin.replace(/\.json$/, '.jsonnet'));
};

const only = async (rows: string, id: string) => {
  const found: unknown[] = JSON.parse(
    await evaluateJsonnetAsync(`[x for x in ${rows} if x.id == ${JSON.stringify(id)}]`),
  );
  if (found.length !== 1) throw new Error(`Expected one row ${id}, found ${found.length}`);
  return found[0];
};

export const evaluateRow = async ({ item, row }: RowView): Promise<RowResult> => {
  try {
    const [evaluatedItem, evaluatedRow] = await Promise.all([
      only(`(import ${JSON.stringify(itemsSource)}).items`, item),
      row === undefined ? undefined : only(`import ${JSON.stringify(recipeSource(row))}`, row),
    ]);
    return row === undefined ? { item: evaluatedItem } : { item: evaluatedItem, row: evaluatedRow };
  } catch (error) {
    return { error: message(error) };
  }
};
