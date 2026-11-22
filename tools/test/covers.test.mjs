import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { coversProblems, dollDressings, readDressing } from '../dress.mjs';
import { installJsonnetSources } from '../sources.mjs';

const repo = resolve(import.meta.dirname, '../..');

test('a covers name is the part its piece is drawn on or a region drawn as a piece of that part', () => {
  const dressing = {
    piece: 'body',
    slots: { body: { part: 'chest' }, cuff: { part: 'sleeve' }, collar: { part: 'neck' } },
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
  assert.equal(problems.length, 6);
  // The throat holds the whole neck, so the neck's primitives mark no piece a consumer could hide by its name.
  assert.match(problems[0], /scarf_worn_collar covers throat, which holds its part neck whole.*name neck/);
  assert.match(problems[1], /vest_worn covers sleeve/);
  assert.match(problems[2], /mitt_worn_cuff covers belly/);
  assert.match(problems[3], /hood_worn_collar covers belly/);
  assert.match(problems[4], /segment tail/);
  assert.match(problems[5], /coat declares .* no worn piece/);
});

test("a doll answers to the player's name for a piece's part with its own part, and cannot hide a region it does not hold", () => {
  const dressing = {
    piece: 'body',
    slots: {
      body: { part: 'spine_03', as: 'torso', unhidden: ['trunk'] },
      clavicle: { part: { right: 'clavicle_r' }, as: 'clavicle' },
    },
    regions: { trunk: ['spine_01'], shoulders: ['spine_03', 'clavicle_r'] },
  };
  const problems = coversProblems(
    [
      { id: 'coat_worn_body', covers: ['torso', 'trunk'] },
      { id: 'coat_worn_clavicle', covers: ['clavicle'] },
      { id: 'vest_worn_body', covers: ['torso', 'shoulders'] },
    ],
    dressing,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /vest_worn_body covers shoulders, which holds its part spine_03 whole.*name spine_03/);
});

// The authored items, which carry what each worn shell covers into its export.
await installJsonnetSources();
const { items } = (await import('../packages/thing-authoring-tool/src/cli/content.ts')).readCatalogue();

test('every worn shell names in covers only its doll part or the regions drawn as pieces of it', () => {
  assert.ok(
    items.some(({ covers }) => covers),
    'no item declares what it covers, so nothing was checked',
  );
  for (const dressing of dollDressings(readDressing(repo))) {
    assert.deepEqual(coversProblems(items, dressing), []);
  }
});

test("the combat boots' foot piece declares the sole below the ankle, which a consumer hides while they are worn", () => {
  assert.deepEqual(items.find(({ id }) => id === 'combat_boots_worn_foot')?.covers, ['sole']);
});
