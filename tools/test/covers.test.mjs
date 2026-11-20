import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { coversProblems, dollDressings, dollGarments, readDressing, wornGarment } from '../dress.mjs';
import { installJsonnetSources } from '../sources.mjs';

const repo = resolve(import.meta.dirname, '../..');

test('a covers name is the part its piece is drawn on or a region with a surface on that part', () => {
  const dressing = {
    piece: 'chest',
    slots: { cuff: { part: 'sleeve' }, collar: { part: 'neck' } },
    regions: { belly: ['chest#belly'], throat: ['neck', 'chest#yoke'] },
  };
  const problems = coversProblems(
    [
      { id: 'coat_worn', covers: ['belly', 'throat'] },
      { id: 'coat_worn_cuff', covers: ['sleeve'] },
      { id: 'scarf_worn_collar', covers: ['throat'] },
      { id: 'vest_worn', covers: ['chest', 'sleeve'] },
      { id: 'mitt_worn_cuff', covers: ['belly'] },
      { id: 'hood_worn_collar', covers: ['belly'] },
      { id: 'coat_worn_tail', covers: ['tail'] },
      { id: 'coat', covers: ['chest'] },
      { id: 'scarf_worn' },
    ],
    dressing,
  );
  assert.equal(problems.length, 5);
  assert.match(problems[0], /vest_worn covers sleeve/);
  assert.match(problems[1], /mitt_worn_cuff covers belly/);
  assert.match(problems[2], /hood_worn_collar covers belly/);
  assert.match(problems[3], /segment tail/);
  assert.match(problems[4], /coat declares .* no worn piece/);
});

// The authored items, which carry what each worn shell covers into its export.
await installJsonnetSources();
const { items } = (await import('../packages/thing-authoring-tool/src/cli/content.ts')).readCatalogue();

test('every worn shell names in covers only its doll part or the regions with a surface on it', () => {
  assert.ok(
    items.some(({ covers }) => covers),
    'no item declares what it covers, so nothing was checked',
  );
  for (const dressing of dollDressings(readDressing(repo))) {
    const own = items.filter(({ id }) => dollGarments(dressing, [wornGarment(id) ?? id]).length > 0);
    assert.deepEqual(coversProblems(own, dressing), []);
  }
});

test("the combat boots' foot piece declares the sole below the ankle, which a consumer hides while they are worn", () => {
  assert.deepEqual(items.find(({ id }) => id === 'combat_boots_worn_foot')?.covers, ['sole']);
});
