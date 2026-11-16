import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { danglingPartItems } from '../partItems.mjs';

const check = (parts) => {
  const out = mkdtempSync(join(tmpdir(), 'part-items-'));
  try {
    mkdirSync(join(out, 'fixture.a/things'), { recursive: true });
    writeFileSync(join(out, 'fixture.a/things/holder.model.json'), JSON.stringify({ id: 'holder', parts }));
    return danglingPartItems({
      files: ['fixture.a/things/holder.model.json', 'fixture.a/things/holder.glb'],
      out,
      models: [{ id: 'holder' }, { id: 'held' }],
    });
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
};

test('a part that declares a model of the tree is an item and a part that declares none is not', () => {
  assert.deepEqual(check({ grip: { item: 'held', massKg: 1 }, base: { massKg: 2 } }), []);
});

test('a part that declares an item no model has is reported with its model and part', () => {
  const [problem, ...rest] = check({ grip: { item: 'missing', massKg: 1 } });
  assert.deepEqual(rest, []);
  assert.match(problem, /holder.*grip.*missing/);
});
