import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { coversProblems, readDressing } from '../dress.mjs';
import { installJsonnetSources } from '../sources.mjs';

const repo = resolve(import.meta.dirname, '../..');

test('a covers name is the part its piece is drawn on or a region the dressing cuts that part into', () => {
  const dressing = { piece: 'chest', slots: { cuff: { part: 'sleeve' } }, regions: { chest: ['belly'] } };
  const problems = coversProblems(
    [
      { id: 'coat_worn', covers: ['belly'] },
      { id: 'coat_worn_cuff', covers: ['sleeve'] },
      { id: 'vest_worn', covers: ['chest', 'sleeve'] },
      { id: 'mitt_worn_cuff', covers: ['belly'] },
      { id: 'coat_worn_tail', covers: ['tail'] },
      { id: 'coat', covers: ['chest'] },
      { id: 'scarf_worn' },
    ],
    dressing,
  );
  assert.equal(problems.length, 4);
  assert.match(problems[0], /vest_worn covers sleeve/);
  assert.match(problems[1], /mitt_worn_cuff covers belly/);
  assert.match(problems[2], /segment tail/);
  assert.match(problems[3], /coat declares .* no worn piece/);
});

// The authored items, which carry what each worn shell covers into its export.
await installJsonnetSources();
const { items } = (await import('../packages/thing-authoring-tool/src/cli/content.ts')).readCatalogue();

test('every worn shell names in covers only its doll part or the regions the dressing cuts it into', () => {
  assert.ok(
    items.some(({ covers }) => covers),
    'no item declares what it covers, so nothing was checked',
  );
  assert.deepEqual(coversProblems(items, readDressing(repo)), []);
});

test("the combat boots' foot piece declares the sole below the ankle, which a consumer hides while they are worn", () => {
  assert.deepEqual(items.find(({ id }) => id === 'combat_boots_worn_foot')?.covers, ['sole']);
});
