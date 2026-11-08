// Hold built/ to fresh builds of the complete tree (tools/build-all.mjs). The first fresh tree must satisfy the manifest
// (tools/manifest.mjs, treeDifferences) and the declared packs (tools/layout.mjs, declaredPacks); every further fresh
// tree must equal the first byte for byte, which shows the build is deterministic across independent runs; and the
// tracked files under built/ must equal the first byte for byte, so a source change and its output land together.
// Usage: node tools/check-built.mjs [--fresh dir ...]. With no --fresh it builds one tree into a temporary folder.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync,readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { buildAll } from './build-all.mjs';
import { declaredPacks, undeclaredDirectories } from './layout.mjs';
import { MANIFEST, treeDifferences } from './manifest.mjs';

const repo = resolve(import.meta.dirname, '..');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });

// Every file under root, as sorted paths relative to it.
export function treeFiles(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort();
}

// The files, present under both roots, whose bytes differ.
export const changedFiles = (files, left, right) =>
  files.filter((file) => !readFileSync(join(left, file)).equals(readFileSync(join(right, file))));

// How tree `other` departs from tree `first`: a file only one of them has, or one whose bytes differ.
export function treeMismatches(first, other) {
  const firstFiles = treeFiles(first);
  const otherFiles = treeFiles(other);
  const inFirst = new Set(firstFiles);
  const inOther = new Set(otherFiles);
  return [
    ...firstFiles.filter((file) => !inOther.has(file)).map((file) => `missing from ${other}: ${file}`),
    ...otherFiles.filter((file) => !inFirst.has(file)).map((file) => `only in ${other}: ${file}`),
    ...changedFiles(firstFiles.filter((file) => inOther.has(file)), first, other).map((file) => `differs in ${other}: ${file}`),
  ];
}

// Every difference between tracked built/ and the fresh trees, the first of which is the reference.
function builtDifferences([reference, ...others]) {
  const tracked = git('ls-files', '-z', '--', 'built').split('\0').filter(Boolean);
  const fresh = treeFiles(reference).map((file) => `built/${file}`);
  const manifest = JSON.parse(readFileSync(join(reference, MANIFEST), 'utf8'));
  const freshSet = new Set(fresh);
  const shared = tracked.filter((file) => freshSet.has(file)).map((file) => relative('built', file));
  return [
    ...treeDifferences({ tracked, fresh, manifest }),
    ...undeclaredDirectories([...tracked, ...fresh], declaredPacks(repo)).map((directory) => `undeclared directory: ${directory}`),
    ...changedFiles(shared, join(repo, 'built'), reference).map((file) => `changed: built/${file}`),
    ...others.flatMap((other) => treeMismatches(reference, other)),
  ];
}

function main() {
  const { values } = parseArgs({ options: { fresh: { type: 'string', multiple: true, default: [] } } });
  if (git('status', '--porcelain', '--', 'built').trim()) throw new Error('built/ must be clean before checking it');
  const temporary = values.fresh.length === 0 ? mkdtempSync(join(tmpdir(), 'skelly-assets-built-')) : undefined;
  try {
    if (temporary) buildAll(temporary);
    const trees = temporary ? [temporary] : values.fresh.map((tree) => resolve(tree));
    for (const tree of trees) if (!existsSync(join(tree, MANIFEST))) throw new Error(`not a built tree, no ${MANIFEST}: ${tree}`);
    const differences = builtDifferences(trees);
    if (differences.length) {
      console.error(differences.join('\n'));
      return 1;
    }
    console.log(`check-built: ${trees.length} fresh tree(s) agree byte for byte, equal the tracked set under built/ and `
      + 'hold every file the manifest names; every directory is a declared pack');
    return 0;
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();
