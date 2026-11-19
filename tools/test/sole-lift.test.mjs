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

/** A model's pieces with their solids. @param {{ parts: { params?: { pieces?: string } }[] }} model */
const solidsOf = ({ parts }) =>
  parts
    .flatMap(({ params }) => (params?.pieces ? JSON.parse(params.pieces) : []))
    .map((piece) => ({ slot: piece.slot, ...solid(piece) }));

/** The top of a model's sole pieces, nothing for a model with none. @param {Parameters<typeof solidsOf>[0]} model */
const soleTop = (model) => {
  const soles = solidsOf(model).filter(({ slot }) => slot === 'sole');
  return soles.length ? Math.max(...soles.map(({ max }) => max[1])) : undefined;
};

const standing = models.filter(
  (model) =>
    isWearable(model, models) &&
    wornPieces(model.id, models, dressing).length === 0 &&
    placeOf(model, dressing).part === 'foot' &&
    !facetTerms(model.tags, 'state').some((state) => dressing.lying.includes(state)) &&
    !(model.id in unworn),
);

// A loose foot model is set down with its bottom at the bare sole; only its soleLift raises the figure onto it.
test('every loose foot model with a sole stands the figure on top of it', () => {
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

// The lift raises the bare heel, so a sole only under the forefoot leaves the heel standing on air. Footwear stands
// toes to +z, so the heel is the back fifth of the model's length, and some piece there must top out at the lift:
// the sole, footbed or board the heel stands on, whatever its slot. A strap or plate rising past the lift holds no heel.
test('every loose foot model that lifts the figure stands its heel on a piece', () => {
  const lifted = standing.filter(({ soleLift = 0 }) => soleLift > 0);
  assert.ok(lifted.length > 0, 'no loose foot model lifts the figure, so nothing was checked');
  const floating = lifted.filter((model) => {
    const solids = solidsOf(model);
    const back = Math.min(...solids.map(({ min }) => min[2]));
    const heel = back + (Math.max(...solids.map(({ max }) => max[2])) - back) / 5;
    return !solids.some(({ min, max }) => min[2] <= heel && Math.abs(max[1] - model.soleLift) < 1e-9);
  });
  assert.deepEqual(
    floating.map(({ id, soleLift }) => `${id}: nothing under the heel tops out at its soleLift ${soleLift}`),
    [],
  );
});
