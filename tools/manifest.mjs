// built/manifest.json: every produced model by id, kind, pack, logical path, part node names and credits, and every
// produced file under its pack. tools/build.mjs writes it; tools/check-built.mjs holds built/ to it.
// Credits come from REUSE.toml: the last annotation whose path matches the file names its author and licence.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { mobFormat, outputPath } from './layout.mjs';

const repo = resolve(import.meta.dirname, '..');
export const MANIFEST = 'manifest.json';

// REUSE's path globs: `**` crosses directories, `*` and `?` do not.
const globPattern = (glob) => new RegExp(`^${glob.split(/(\*\*|\*|\?)/).map((piece) => {
  if (piece === '**') return '.*';
  if (piece === '*') return '[^/]*';
  if (piece === '?') return '[^/]';
  return piece.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}).join('')}$`);

const STRING = /^"((?:[^"\\]|\\.)*)"$/;
const unquote = (text, where) => {
  const match = STRING.exec(text);
  if (!match) throw new Error(`REUSE.toml ${where}: expected a string, read ${text}`);
  return JSON.parse(`"${match[1]}"`);
};
const stringList = (text, where) => {
  if (!text.startsWith('[') || !text.endsWith(']')) throw new Error(`REUSE.toml ${where}: expected a list of strings`);
  return text.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean).map((item) => unquote(item, where));
};

// The annotations of REUSE.toml, read strictly: a line the reader does not know is an error, never skipped.
export function readAnnotations(root = repo) {
  const annotations = [];
  let current;
  readFileSync(join(root, 'REUSE.toml'), 'utf8').split('\n').forEach((raw, index) => {
    const line = raw.trim();
    const where = `line ${index + 1}`;
    if (line === '' || line.startsWith('#')) return;
    if (line === '[[annotations]]') {
      current = {};
      annotations.push(current);
      return;
    }
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/.exec(line);
    if (!match) throw new Error(`REUSE.toml ${where}: unknown line ${line}`);
    const [, key, value] = match;
    if (current === undefined) {
      if (key !== 'version' || value !== '1') throw new Error(`REUSE.toml ${where}: only version = 1 precedes the annotations`);
      return;
    }
    if (Object.hasOwn(current, key)) throw new Error(`REUSE.toml ${where}: ${key} given twice`);
    if (key === 'path') current.path = value.startsWith('[') ? stringList(value, where) : [unquote(value, where)];
    else if (key === 'SPDX-FileCopyrightText' || key === 'SPDX-License-Identifier') current[key] = unquote(value, where);
    else throw new Error(`REUSE.toml ${where}: unknown key ${key}`);
  });
  for (const annotation of annotations) {
    for (const key of ['path', 'SPDX-FileCopyrightText', 'SPDX-License-Identifier']) {
      if (!Object.hasOwn(annotation, key)) throw new Error(`REUSE.toml: an annotation has no ${key}`);
    }
  }
  return annotations.map((annotation) => ({ ...annotation, patterns: annotation.path.map(globPattern) }));
}

// path (relative to the repo) -> { author, licence } of the last annotation that matches it.
export function readCredits(root = repo) {
  const annotations = readAnnotations(root);
  return (path) => {
    const annotation = annotations.findLast(({ patterns }) => patterns.some((pattern) => pattern.test(path)));
    if (!annotation) throw new Error(`no REUSE.toml annotation covers ${path}`);
    return { author: annotation['SPDX-FileCopyrightText'], licence: annotation['SPDX-License-Identifier'] };
  };
}

// The mob rows' models and files. A mob GLB is one mesh node named by its row, with no assembly, so it has no part
// nodes. A pose row is an actor row, which this manifest does not carry yet.
export function mobManifest(rows) {
  const models = [];
  const files = [];
  for (const row of rows) {
    if (mobFormat(row) !== 'matrices') throw new Error(`${row.id}: a pose row is an actor row, which the manifest does not carry`);
    models.push({ id: row.id, kind: 'mob', pack: row.pack, path: row.glb, clips: row.clips });
    files.push(outputPath(row.pack, row.glb), outputPath(row.pack, row.clips));
  }
  return { models, files };
}

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// models: { id, kind, pack, path, nodes?, clips? }, paths logical under the pack; files: every produced file as
// <pack>/<logical path>; credit: a repo path -> { author, licence }.
export function buildManifest({ models, files, credit }) {
  const packs = {};
  for (const file of [...new Set(files)].sort(byText)) {
    const [pack, ...rest] = file.split('/');
    outputPath(pack, rest.join('/'));
    (packs[pack] ??= { files: [] }).files.push(rest.join('/'));
  }
  const known = new Set(files);
  const ids = new Set();
  const entries = [...models].sort((a, b) => byText(a.pack, b.pack) || byText(a.id, b.id)).map((model) => {
    const file = outputPath(model.pack, model.path);
    if (!known.has(file)) throw new Error(`${model.id}: ${file} is not a produced file`);
    if (model.clips !== undefined && !known.has(outputPath(model.pack, model.clips))) throw new Error(`${model.id}: its clips are not a produced file`);
    const key = `${model.pack}/${model.id}`;
    if (ids.has(key)) throw new Error(`${model.id}: two models of one id in ${model.pack}`);
    ids.add(key);
    return {
      id: model.id,
      kind: model.kind,
      pack: model.pack,
      path: model.path,
      ...(model.nodes === undefined ? {} : { nodes: [...model.nodes] }),
      ...(model.clips === undefined ? {} : { clips: model.clips }),
      credits: credit(`built/${file}`),
    };
  });
  return {
    _doc: 'Every model built/ holds and every produced file under its pack, written by tools/build.mjs; paths are logical under built/<pack>/. nodes: the GLB part node names of the resolved assembly. credits: from REUSE.toml.',
    packs: Object.fromEntries(Object.entries(packs).sort(([a], [b]) => byText(a, b))),
    models: entries,
  };
}

export const manifestJson = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

// Every file a manifest names, as a repo path under built/, the manifest itself included.
export function manifestFiles(manifest) {
  return new Set([
    `built/${MANIFEST}`,
    ...Object.entries(manifest.packs).flatMap(([pack, { files }]) => files.map((file) => `built/${outputPath(pack, file)}`)),
  ]);
}

// The set comparison of tools/check-built.mjs: the fresh set equals the tracked set, nothing flat but the manifest,
// and the manifest names exactly the fresh files.
export function treeDifferences({ tracked, fresh, manifest }) {
  const differences = [];
  const trackedSet = new Set(tracked);
  const freshSet = new Set(fresh);
  const named = manifestFiles(manifest);
  for (const file of new Set([...tracked, ...fresh])) {
    if (file.split('/').length === 2 && file !== `built/${MANIFEST}`) differences.push(`flat under built/: ${file}`);
  }
  for (const file of tracked) if (!freshSet.has(file)) differences.push(`tracked, not produced: ${file}`);
  for (const file of fresh) if (!trackedSet.has(file)) differences.push(`produced, not tracked: ${file}`);
  for (const file of fresh) if (!named.has(file)) differences.push(`produced, not in the manifest: ${file}`);
  for (const file of named) if (!freshSet.has(file)) differences.push(`in the manifest, not produced: ${file}`);
  return differences.sort(byText);
}
