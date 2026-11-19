import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { compileJsonnetFile } from '../jsonnet/index.mjs';

const DRAFTS = join(import.meta.dirname, '../../models/catalogue/drafts');
const FINISHES = join(import.meta.dirname, '../../models/finishes.jsonnet');

// Each set's rows by id, with the slots their parts mark paintable, without building any geometry.
let rows;
const setRows = () => (rows ??= compileSetRows());
function compileSetRows() {
  const dir = mkdtempSync(join(tmpdir(), 'catalogue-drafts-'));
  try {
    const source = join(dir, 'rows.jsonnet');
    writeFileSync(
      source,
      `local sets = import 'models/catalogue/sets/index.libsonnet';
{
  [name]: {
    [row.id]: { paintable: std.flattenArrays([std.get(part, 'paintable', []) for part in std.get(row, 'parts', [])]) }
    for row in sets[name]
  }
  for name in std.objectFields(sets)
}
`,
    );
    return JSON.parse(compileJsonnetFile(source));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const drafts = readdirSync(DRAFTS)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    set: file.slice(0, -'.json'.length),
    items: JSON.parse(readFileSync(join(DRAFTS, file), 'utf8')),
  }));
const allDrafts = drafts.flatMap(({ set, items }) => items.map((item) => ({ set, item })));
const holders = new Map(allDrafts.filter(({ item }) => item.container?.holds).map(({ item }) => [item.id, item]));
const contents = allDrafts.filter(({ item }) => item.form !== undefined);

// A draft is applied to a model by id, so one naming a missing model, or a set's model drafted from another file,
// would be applied to nothing or found in the wrong place.
test('every item draft names a model of the set its file is named for', () => {
  const sets = setRows();
  for (const { set, items } of drafts) {
    assert.ok(sets[set], `drafts/${set}.json has no set ${set}`);
    for (const { id, model } of items)
      assert.ok(sets[set][model], `${set}: ${id} names ${model}, not a row of the set`);
  }
});

test('item draft ids are unique', () => {
  const ids = allDrafts.map(({ item }) => item.id);
  assert.deepEqual(
    ids.filter((id, at) => ids.indexOf(id) !== at),
    [],
  );
});

// Drafts hold our own values only; a link to another game's item would carry its data and licence along.
test('no item draft links to a reference item', () => {
  for (const { set, item } of allDrafts) assert.ok(!('reference' in item), `${set}: ${item.id} has a reference`);
});

// One holder model serves every content of its forms, so the game tells them apart by repainting the label alone.
test("a holder's model marks its label, and only its label, paintable", () => {
  assert.ok(holders.size > 0, 'no holder drafts');
  const sets = setRows();
  for (const { set, item } of allDrafts.filter(({ item }) => holders.has(item.id))) {
    assert.deepEqual(sets[set][item.model]?.paintable, ['label'], `${set}: ${item.id}'s model ${item.model}`);
  }
});

// Contents spawn filled in their holder as one stack, so a package the holder refuses or cannot fit never spawns.
test('a content packs into a holder that admits its form and fits its count', () => {
  assert.ok(contents.length > 0, 'no content drafts');
  const finishes = JSON.parse(compileJsonnetFile(FINISHES));
  for (const { set, item } of contents) {
    const where = `${set}: ${item.id}`;
    const holder = holders.get(item.packaging?.holder);
    assert.ok(holder, `${where} packs into ${item.packaging?.holder}, no holder draft`);
    const { holds, maxCount, maxVolumeCm3 } = holder.container;
    assert.ok(holds.forms.includes(item.form), `${where}: ${holder.id} does not admit form ${item.form}`);
    assert.ok(item.packaging.count <= (item.stack ?? 1), `${where}: a package is one stack`);
    if (maxCount !== undefined) assert.ok(item.packaging.count <= maxCount, `${where} overfills ${holder.id}`);
    if (maxVolumeCm3 !== undefined)
      assert.ok(item.packaging.count * item.volumeCm3 <= maxVolumeCm3, `${where} overfills ${holder.id}`);
    assert.ok(finishes[item.labelFinish], `${where}: label finish ${item.labelFinish} is no finish`);
  }
});

// A content is drawn loose or in whichever holder it comes in, so a name that carries a container would be wrong
// for the rest: a holder of one kind already names itself after its contents.
test('a content is named for itself, not for a container', () => {
  const containerNouns = [...holders.values()].map(({ name }) => name.split(' ').at(-1).toLowerCase());
  for (const { set, item } of contents) {
    const words = item.name.toLowerCase().split(/[^a-z]+/);
    assert.ok(!words.some((word) => containerNouns.includes(word)), `${set}: ${item.id} is named "${item.name}"`);
    assert.doesNotMatch(item.name, /^\S+ of /i, `${set}: ${item.id} is named "${item.name}"`);
  }
});
