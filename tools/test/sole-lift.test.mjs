import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { isWearable, placeOf, readDressing, wornPieces } from '../dress.mjs';
import { solid } from '../pieceSolid.mjs';
import { installJsonnetSources } from '../sources.mjs';
import { facetTerms } from '../taxonomy.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Footwear whose sole piece stands no foot on it, so the figure keeps its bare height.
const unworn = {
  wetsuit_booties: 'a sock laid on its side, its rubber sole running up the edge',
};

await installJsonnetSources();
const { items } = JSON.parse(readFileSync(resolve(repo, 'tools/packages/thing-authoring-tool/items.json'), 'utf8'));
const models = items.map((item) => ({ ...item, tags: item.taxonomy?.tags }));
const dressing = readDressing(repo);

/** The top of a model's sole pieces, nothing for a model with none. @param {{ parts: { params?: { pieces?: string } }[] }} model */
const soleTop = ({ parts }) => {
  const soles = parts
    .flatMap(({ params }) => (params?.pieces ? JSON.parse(params.pieces) : []))
    .filter(({ slot }) => slot === 'sole');
  return soles.length ? Math.max(...soles.map((piece) => solid(piece).max[1])) : undefined;
};

// A loose foot model is set down with its bottom at the bare sole; only its soleLift raises the figure onto it.
test('every loose foot model with a sole stands the figure on top of it', () => {
  const standing = models.filter(
    (model) =>
      isWearable(model, models) &&
      wornPieces(model.id, models, dressing).length === 0 &&
      placeOf(model, dressing).part === 'foot' &&
      !facetTerms(model.tags, 'state').some((state) => dressing.lying.includes(state)) &&
      !(model.id in unworn),
  );
  const soled = standing.flatMap((model) => {
    const top = soleTop(model);
    return top === undefined ? [] : [{ id: model.id, top, soleLift: model.soleLift }];
  });
  assert.ok(soled.length > 0, 'no loose foot model has a sole, so nothing was checked');
  const sunk = soled.filter(({ top, soleLift = 0 }) => soleLift < top - 1e-9);
  assert.deepEqual(
    sunk.map(
      ({ id, top, soleLift }) => `${id}: soleLift ${soleLift ?? 'missing'} below its sole's top ${top.toFixed(4)}`,
    ),
    [],
  );
});
