// Check fresh builds of the complete tree (tools/build-all.mjs). The first fresh tree must satisfy its manifest and the
// declared packs (tools/manifest.mjs, treeDifferences); every further fresh tree must equal the first byte for byte,
// which shows the build is deterministic across independent runs.
// Usage: node tools/check-built.mjs [--fresh dir ...]. With no --fresh it builds one tree into a temporary folder.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { buildAll } from './build-all.mjs';
import { declaredPacks } from './layout.mjs';
import { MANIFEST, treeDifferences } from './manifest.mjs';

const repo = resolve(import.meta.dirname, '..');

// Every file under root, as sorted paths relative to it.
function treeFiles(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort();
}

// How tree `other` departs from tree `first`: a file only one of them has, or one whose bytes differ.
export function treeMismatches(first, other) {
  const firstFiles = treeFiles(first);
  const otherFiles = treeFiles(other);
  const inFirst = new Set(firstFiles);
  const inOther = new Set(otherFiles);
  const differs = (file) => !readFileSync(join(first, file)).equals(readFileSync(join(other, file)));
  return [
    ...firstFiles.filter((file) => !inOther.has(file)).map((file) => `missing from ${other}: ${file}`),
    ...otherFiles.filter((file) => !inFirst.has(file)).map((file) => `only in ${other}: ${file}`),
    ...firstFiles.filter((file) => inOther.has(file) && differs(file)).map((file) => `differs in ${other}: ${file}`),
  ];
}

// Every way the fresh trees fail the check, the first of them being the reference.
function freshDifferences([reference, ...others]) {
  const manifest = JSON.parse(readFileSync(join(reference, MANIFEST), 'utf8'));
  const files = treeFiles(reference).map((file) => `built/${file}`);
  return [
    ...treeDifferences({ files, manifest, declared: declaredPacks(repo) }),
    ...others.flatMap((other) => treeMismatches(reference, other)),
  ];
}

function main() {
  const { values } = parseArgs({ options: { fresh: { type: 'string', multiple: true, default: [] } } });
  const temporary = values.fresh.length === 0 ? mkdtempSync(join(tmpdir(), 'skelly-assets-built-')) : undefined;
  try {
    if (temporary) buildAll(temporary);
    const trees = temporary ? [temporary] : values.fresh.map((tree) => resolve(tree));
    for (const tree of trees) if (!existsSync(join(tree, MANIFEST))) throw new Error(`not a built tree, no ${MANIFEST}: ${tree}`);
    const differences = freshDifferences(trees);
    if (differences.length) {
      console.error(differences.join('\n'));
      return 1;
    }
    console.log(`check-built: ${trees.length} fresh tree(s) agree byte for byte and hold exactly the files the manifest `
      + 'names; every directory is a declared pack and every declared pack has a model');
    return 0;
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();
