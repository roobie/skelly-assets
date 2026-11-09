// manifest.json: every produced model by id, kind, pack, logical path, taxonomy, part node names, label and credits, every
// vehicle's placements file (tools/placements.mjs), and every produced file under its pack. tools/build.mjs writes it;
// tools/check-built.mjs holds every fresh build to it.
// Credits come from REUSE.toml: the last annotation whose path matches the file names its author and licence.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { outputPath, undeclaredDirectories } from './layout.mjs';
import { manifestTaxonomy } from './taxonomy.mjs';

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

// Every mob row is an actor model with a body and pose clips.
export function mobManifest(rows) {
  const models = [];
  const files = [];
  for (const row of rows) {
    models.push({ id: row.id, kind: 'mob', pack: row.pack, path: row.glb, clips: row.clips, body: row.body });
    files.push(outputPath(row.pack, row.glb), outputPath(row.pack, row.body), outputPath(row.pack, row.clips));
  }
  return { models, files };
}

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// models: { id, kind, pack, path, taxonomy?, nodes?, label?, clips? }, paths logical under the pack; vehicles:
// { id, pack, path } of each vehicle's placements; files: every produced file as <pack>/<logical path>; credit: a repo
// path -> { author, licence }.
export function buildManifest({ models, vehicles = [], files, credit }) {
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
    if (model.body !== undefined && !known.has(outputPath(model.pack, model.body))) throw new Error(`${model.id}: its body is not a produced file`);
    const key = `${model.pack}/${model.id}`;
    if (ids.has(key)) throw new Error(`${model.id}: two models of one id in ${model.pack}`);
    ids.add(key);
    return {
      id: model.id,
      kind: model.kind,
      pack: model.pack,
      path: model.path,
      ...manifestTaxonomy(model.taxonomy),
      ...(model.nodes === undefined ? {} : { nodes: [...model.nodes] }),
      ...(model.label === undefined ? {} : { label: model.label }),
      ...(model.clips === undefined ? {} : { clips: model.clips }),
      ...(model.body === undefined ? {} : { body: model.body }),
      credits: credit(`built/${file}`),
    };
  });
  const vehicleIds = new Set();
  const vehicleEntries = [...vehicles].sort((a, b) => byText(a.id, b.id)).map(({ id, pack, path }) => {
    const file = outputPath(pack, path);
    if (!known.has(file)) throw new Error(`vehicle ${id}: ${file} is not a produced file`);
    if (vehicleIds.has(id)) throw new Error(`vehicle ${id}: placed twice`);
    vehicleIds.add(id);
    return { id, pack, path, credits: credit(`built/${file}`) };
  });
  return {
    _doc: 'Every model the built tree holds, every vehicle\'s placements and every produced file under its pack, written by tools/build.mjs; paths are logical under <pack>/. category and tags: the model\'s shelf and facet terms, defined in models/taxonomy.json. nodes: the GLB part node names of the resolved assembly. label: the text printed on the model and the rectangle it fills, in metres in the GLB frame; consumers draw it, the GLB has no lettering. vehicles: each vehicle\'s sites, the model id of the part at each site, its position in the vehicle frame and whether it is a mirrored far-side twin. credits: from REUSE.toml.',
    packs: Object.fromEntries(Object.entries(packs).sort(([a], [b]) => byText(a, b))),
    models: entries,
    vehicles: vehicleEntries,
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

// How a fresh tree departs from its manifest and the declared packs (layout.mjs, declaredPacks): nothing flat but the
// manifest, the manifest names exactly the produced files, every directory is a declared pack, and every declared pack
// has a model, so a pack whose rows the production build skips is caught. files: the tree's files under built/.
export function treeDifferences({ files, manifest, declared }) {
  const produced = new Set(files);
  const named = manifestFiles(manifest);
  const modelled = new Set(manifest.models.map((model) => model.pack));
  return [
    ...files.filter((file) => file.split('/').length === 2 && file !== `built/${MANIFEST}`).map((file) => `flat under built/: ${file}`),
    ...files.filter((file) => !named.has(file)).map((file) => `produced, not in the manifest: ${file}`),
    ...[...named].filter((file) => !produced.has(file)).map((file) => `in the manifest, not produced: ${file}`),
    ...undeclaredDirectories(files, declared).map((directory) => `undeclared directory: ${directory}`),
    ...[...declared].filter((pack) => !modelled.has(pack)).map((pack) => `declared pack without a model: ${pack}`),
  ].sort(byText);
}
