// @ts-check
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { closureCode, importClosure } from '../importClosure.mjs';

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
