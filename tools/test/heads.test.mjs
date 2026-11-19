import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';

import { compileJsonnetFiles, evaluateJsonnet, REPOSITORY_ROOT } from '../jsonnet/index.mjs';
import { HEADS, headsIndex, INDEX, ROW_DIRS } from '../row-index.mjs';
import { compilerCode, refreshJsonnetTwins } from '../sources.mjs';

const HEADS_IMPORT = "import 'models/catalogue/heads.libsonnet'";
// The jsonnet module's root is the tools folder, which it searches beside the folder above it.
const REPOSITORY = resolve(REPOSITORY_ROOT, '..');
const RECIPES = join(REPOSITORY, 'models/recipes');
const DEADVOX = join(REPOSITORY, 'tools/packages/thing-authoring-tool/exports/deadvox.jsonnet');

/** @type {string} */
let scratch;
// The heads as a compile reads them in place of models/catalogue/heads.libsonnet: assembled from each row file's stored heads.
/** @type {string} */
let overlayHeads;

before(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'heads-'));
  const source = join(scratch, 'heads.jsonnet');
  writeFileSync(source, HEADS_IMPORT);
  await refreshJsonnetTwins([source], {
    root: REPOSITORY,
    stamp: join(scratch, 'stamp'),
    store: join(scratch, 'store'),
    code: compilerCode(),
    rowIndexes: ROW_DIRS.map((dir) => join(dir, INDEX)),
    heads: HEADS,
  });
  overlayHeads = readFileSync(join(scratch, 'heads.json'), 'utf8');
});

after(() => rmSync(scratch, { recursive: true, force: true }));

// A compile that stands the assembled heads in for the heads file must read what the file says over the rows.
test('the heads a compile reads in place of the heads file equal the file over the rows', () => {
  assert.deepEqual(JSON.parse(overlayHeads), JSON.parse(evaluateJsonnet(HEADS_IMPORT)));
});

// The heads are the six fields a recipe reads, and an optional one is read with std.objectHas or std.get, so a field
// outside them would silently look absent over heads; a recipe over every field of the rows must come out the same.
test('every reader of the heads, over the rows, equals the reader over the heads', () => {
  const recipes = [
    ...readdirSync(RECIPES)
      .filter((name) => name.endsWith('.jsonnet'))
      .map((name) => join(RECIPES, name)),
    DEADVOX,
  ];
  const overlay = (name, text) => {
    const folder = join(scratch, name, 'models/catalogue');
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, basename(HEADS)), text);
    return join(scratch, name);
  };
  const fullRows = headsIndex()
    .replace(/^local heads = .*\n/m, '')
    .replaceAll(/heads\.of\((import '[^']+')\)/g, '$1');
  const overHeads = compileJsonnetFiles(recipes, REPOSITORY_ROOT, { overlay: overlay('heads', overlayHeads) });
  const overRows = compileJsonnetFiles(recipes, REPOSITORY_ROOT, { overlay: overlay('rows', fullRows) });
  recipes.forEach((recipe, at) => assert.equal(overHeads[at], overRows[at], basename(recipe)));
});
