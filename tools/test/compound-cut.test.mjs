import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';

const repo = resolve(import.meta.dirname, '../..');
const cut = (call) =>
  JSON.parse(
    evaluateJsonnet(
      `
  local h = import 'tools/packages/thing-authoring-tool/compound.libsonnet';
  local cap = h.disc('cap', 'cap', 0.05, 0, 0.01, 0, 0.12);
  local cut = h.cut;
  [p.id for p in ${call}]`,
      repo,
    ),
  );

// A turned piece's profile is not a section, so slicing one would leave it open; a cut must not pick its side unasked.
test('a cut refuses a turned piece it crosses', () => {
  assert.throws(() => cut("cut([cap], 'z', 0.1, 1)"), /cap straddles the cut at z = 0.1/);
});

test('a cut keeps or drops a turned piece wholly to one side', () => {
  assert.deepEqual(cut("cut([cap], 'z', 0.06, 1)"), ['cap']);
  assert.deepEqual(cut("cut([cap], 'z', 0.06, -1)"), []);
});

test('a cut hands a turned piece it crosses to the side holding its middle when told to keep it whole', () => {
  assert.deepEqual(cut("cut([cap], 'z', 0.1, 1, whole=true)"), ['cap']);
  assert.deepEqual(cut("cut([cap], 'z', 0.1, -1, whole=true)"), []);
});
