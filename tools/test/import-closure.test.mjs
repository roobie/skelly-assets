// @ts-check
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { closureCode, importClosure } from '../importClosure.mjs';
import { recipeTools } from '../recipeTools.mjs';
import { installJsonnetSources } from '../sources.mjs';

const tools = resolve(import.meta.dirname, '..');

/**
 * What `use` gives of a folder holding `files`, which is removed after. The folder is named as the closure names its
 * files, by its real path, since a temporary folder may be reached through a link.
 * @template T
 * @param {Readonly<Record<string, string>>} files
 * @param {(folder: string) => T} use
 */
const inFolder = (files, use) => {
  const folder = realpathSync(mkdtempSync(join(tmpdir(), 'import-closure-')));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(folder, path)), { recursive: true });
      writeFileSync(join(folder, path), text);
    }
    return use(folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
};

/**
 * The closure of `entry` in a folder holding `files`, as paths from the folder.
 * @param {Readonly<Record<string, string>>} files
 * @param {string} [entry]
 */
const closureIn = (files, entry = 'entry.mjs') =>
  inFolder(files, (folder) => importClosure([join(folder, entry)]).map((file) => relative(folder, file)));

/**
 * The closure of a tools module, as paths from tools/.
 * @param {string} module
 */
const closureOf = (module) => importClosure([join(tools, module)]).map((file) => relative(tools, file));

test('a closure holds its entry and what it imports, through any number of imports and around a cycle', () => {
  assert.deepEqual(
    closureIn({
      'entry.mjs': "import { a } from './lib/a.mjs';\nexport { b } from './b.ts';\nimport './effect.js';\n",
      'lib/a.mjs': "import {\n  deep,\n  deeper,\n} from '../deep.mjs';\n",
      'deep.mjs': "import { a } from './lib/a.mjs';\n",
      'b.ts': 'export const b = 1;\n',
      'effect.js': '',
      'unused.mjs': '',
    }),
    ['b.ts', 'deep.mjs', 'effect.js', 'entry.mjs', 'lib/a.mjs'],
  );
});

test('a closure holds the data a module imports, which it does not read for imports', () => {
  assert.deepEqual(
    closureIn({
      'entry.mjs': "import table from './table.json' with { type: 'json' };\n",
      'table.json': '{ "note": "import \'./nothing.mjs\'" }',
    }),
    ['entry.mjs', 'table.json'],
  );
});

test('a closure follows an import made while running and a worker thread named by a URL beside its module', () => {
  assert.deepEqual(
    closureIn({
      'entry.mjs':
        "const { late } = await import('./late.mjs');\n" +
        "const pool = workerPool(new URL('./thread.mjs', import.meta.url), 'work');\n" +
        "const page = new URL('./page.html', import.meta.url);\n",
      'late.mjs': '',
      'thread.mjs': '',
      'page.html': '',
    }),
    ['entry.mjs', 'late.mjs', 'thread.mjs'],
  );
});

test('a closure leaves out what only types name, since types are erased before a module runs', () => {
  assert.deepEqual(
    closureIn({
      'entry.mjs':
        "/** @import { Shape } from './types.ts' */\n" +
        "import type { Other } from './other-types.ts';\n" +
        "import { type Kept, value } from './value.ts';\n",
      'types.ts': '',
      'other-types.ts': '',
      'value.ts': '',
    }),
    ['entry.mjs', 'value.ts'],
  );
});

test('a closure leaves out the runtime and the modules of node_modules, which the lockfile and Node version pin', () => {
  assert.deepEqual(
    closureIn({
      'entry.mjs': "import { join } from 'node:path';\nimport * as v from 'valibot';\nimport 'no-such-package';\n",
    }),
    ['entry.mjs'],
  );
  assert.ok(closureCode(tools, [join(tools, 'codeUnitOrder.mjs')]).includes('package-lock.json'));
});

test('a closure follows a workspace package by name, and refuses one whose module does not resolve', () => {
  const workspace = {
    'entry.mjs': "import { shared } from '@fixture/shared/module';\n",
    'packages/shared/package.json': JSON.stringify({
      name: '@fixture/shared',
      exports: { './module': './src/module.ts' },
    }),
    'packages/shared/src/module.ts': "import { inner } from './inner.ts';\n",
    'packages/shared/src/inner.ts': '',
  };
  /** @param {string} folder */
  const linked = (folder) => {
    mkdirSync(join(folder, 'node_modules/@fixture'), { recursive: true });
    symlinkSync(join(folder, 'packages/shared'), join(folder, 'node_modules/@fixture/shared'));
    return importClosure([join(folder, 'entry.mjs')]).map((file) => relative(folder, file));
  };
  assert.deepEqual(inFolder(workspace, linked), [
    'entry.mjs',
    'packages/shared/src/inner.ts',
    'packages/shared/src/module.ts',
  ]);
  assert.throws(
    () => inFolder({ ...workspace, 'entry.mjs': "import { shared } from '@fixture/shared/unexported';\n" }, linked),
    /entry\.mjs: imports @fixture\/shared\/unexported of a workspace package, which does not resolve/,
  );
});

test('a closure takes a module by path or by URL', () => {
  inFolder({ 'entry.mjs': '' }, (folder) =>
    assert.deepEqual(importClosure([pathToFileURL(join(folder, 'entry.mjs'))]), [join(folder, 'entry.mjs')]),
  );
});

test('an import that cannot be traced is refused, naming its module', () => {
  assert.throws(
    () => closureIn({ 'entry.mjs': 'const module = await import(name);\n' }),
    /entry\.mjs: an import of a computed specifier cannot be traced/,
  );
  assert.throws(
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the module's text holds the template.
    () => closureIn({ 'entry.mjs': 'const module = await import(`./${name}.mjs`);\n' }),
    /entry\.mjs: an import of a computed specifier cannot be traced/,
  );
  assert.throws(
    () => closureIn({ 'entry.mjs': "import { gone } from './gone.mjs';\n" }),
    /entry\.mjs: imports \.\/gone\.mjs, which is no file/,
  );
});

// What each cache's hand-kept list of code once left out, which its entries were then not keyed by.
test('a recipe tool is keyed by the workspace packages its exports import by name', async () => {
  await installJsonnetSources();
  const { gun, thing } = await recipeTools();
  for (const tool of [gun, thing]) {
    const closure = importClosure((tool.code ?? []).map((module) => join(tools, module))).map((file) =>
      relative(tools, file),
    );
    assert.ok(closure.includes('packages/motion/src/motion.ts'));
    assert.ok(closure.includes('packages/surfaces/src/schema.ts'));
    assert.ok(!closure.some((file) => file.includes('/viewer/')), 'a viewer is no part of an export');
  }
  const gunCode = importClosure((gun.code ?? []).map((module) => join(tools, module)));
  assert.ok(gunCode.includes(join(tools, 'codeUnitOrder.mjs')));
});

test('the swing check is keyed by the motion math and the model frame its sweeps pose by', () => {
  const closure = closureOf('swingClearance.mjs');
  assert.ok(closure.includes('packages/motion/src/motion.ts'));
  assert.ok(closure.includes('../site/modelFrame.mjs'));
  assert.ok(closure.includes('swingSweep.mjs'));
});

test('the overlap check is keyed by the vector math its solids are built on', () => {
  assert.ok(closureOf('siteOverlap.mjs').includes('packages/construct/src/foundation/math.ts'));
});

// A probe or a bake reads a model as its built bytes, so the code that built the model must not key it: a change to
// that code which leaves the bytes alone costs no probe; see docs/decisions/0019-garment-rest-check.md.
test('a check that reads built models is keyed by no authoring tool', () => {
  for (const module of ['restPoke.mjs', 'wields.mjs', 'swingClearance.mjs', 'siteOverlap.mjs']) {
    const authoring = closureOf(module).filter((file) => /^packages\/[a-z-]+-authoring-tool\//.test(file));
    assert.deepEqual(authoring, [], module);
  }
});
