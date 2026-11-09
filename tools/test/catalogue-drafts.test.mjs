import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { compileJsonnetFile } from '../jsonnet/index.mjs';

const DRAFTS = join(import.meta.dirname, '../../models/catalogue/drafts');

// Each set's row ids, without building any geometry.
function setIds() {
  const dir = mkdtempSync(join(tmpdir(), 'catalogue-drafts-'));
  try {
    const source = join(dir, 'ids.jsonnet');
    writeFileSync(source, `local sets = import 'models/catalogue/sets/index.libsonnet';
{ [name]: [row.id for row in sets[name]] for name in std.objectFields(sets) }
`);
    return JSON.parse(compileJsonnetFile(source));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const drafts = readdirSync(DRAFTS)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({ set: file.slice(0, -'.json'.length), items: JSON.parse(readFileSync(join(DRAFTS, file), 'utf8')) }));

// A draft is applied to a model by id, so one naming a missing model, or a set's model drafted from another file,
// would be applied to nothing or found in the wrong place.
test('every item draft names a model of the set its file is named for', () => {
  const sets = setIds();
  for (const { set, items } of drafts) {
    assert.ok(sets[set], `drafts/${set}.json has no set ${set}`);
    for (const { id, model } of items) assert.ok(sets[set].includes(model), `${set}: ${id} names ${model}, not a row of the set`);
  }
});

test('item draft ids are unique', () => {
  const ids = drafts.flatMap(({ items }) => items.map(({ id }) => id));
  assert.deepEqual(ids.filter((id, at) => ids.indexOf(id) !== at), []);
});

// Drafts hold our own values only; a link to another game's item would carry its data and licence along.
test('no item draft links to a reference item', () => {
  for (const { set, items } of drafts) {
    for (const item of items) assert.ok(!('reference' in item), `${set}: ${item.id} has a reference`);
  }
});
