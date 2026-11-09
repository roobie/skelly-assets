// Packs a built tree into release assets: one <packId>.tar.gz per pack directory, holding <packId>/..., plus the
// manifest beside them, so a consumer pinning a release fetches only the packs it bundles. The manifest's renames also
// ship alone as renames.json, so a consumer moving its pin maps its saved ids without reading the whole manifest, and
// its finishes as finishes.json, so a consumer that repaints vehicle parts at spawn bundles the library alone.
// The archives are reproducible: the same tree yields the same bytes whatever its file times, owners or modes, so a
// rebuilt release can be compared with the one published. Needs GNU tar.
// Usage: node tools/pack-release.mjs <built tree> <out dir>
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { MANIFEST } from './manifest.mjs';

export const RENAMES_ASSET = 'renames.json';
export const FINISHES_ASSET = 'finishes.json';

// Fixes every per-entry field the filesystem would otherwise leak into the archive.
const TAR_NORMALIZE = ['--sort=name', '--format=gnu', '--mtime=@0', '--owner=0', '--group=0', '--numeric-owner', '--mode=u=rwX,go=rX'];

export function packRelease(tree, out) {
  const entries = readdirSync(tree, { withFileTypes: true });
  const strays = entries.filter((entry) => !entry.isDirectory() && entry.name !== MANIFEST).map((entry) => entry.name);
  if (strays.length) throw new Error(`only pack directories and ${MANIFEST} belong in a release, found: ${strays.join(' ')}`);
  const { renames, finishes } = JSON.parse(readFileSync(join(tree, MANIFEST), 'utf8'));
  if (renames === undefined) throw new Error(`${MANIFEST} has no renames to release as ${RENAMES_ASSET}`);
  if (finishes === undefined) throw new Error(`${MANIFEST} has no finishes to release as ${FINISHES_ASSET}`);
  mkdirSync(out, { recursive: true });
  const packs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const pack of packs) {
    const tar = execFileSync('tar', ['-C', tree, ...TAR_NORMALIZE, '-cf', '-', pack], { maxBuffer: 2 ** 31 - 1 });
    // Node's gzip header carries no name and a zero time, as `gzip -n` writes.
    writeFileSync(join(out, `${pack}.tar.gz`), gzipSync(tar, { level: 9 }));
  }
  copyFileSync(join(tree, MANIFEST), join(out, MANIFEST));
  writeFileSync(join(out, RENAMES_ASSET), `${JSON.stringify(renames, null, 2)}\n`);
  writeFileSync(join(out, FINISHES_ASSET), `${JSON.stringify(finishes, null, 2)}\n`);
  return packs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [tree, out] = process.argv.slice(2);
  if (!tree || !out) throw new Error('usage: node tools/pack-release.mjs <built tree> <out dir>');
  for (const pack of packRelease(tree, out)) console.log(`packed ${pack}.tar.gz`);
}
