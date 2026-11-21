// @ts-check
/** @import { MobRow, SoundRow } from './layout.mjs' */
// manifest.json: every produced model by id, kind, pack, logical path, taxonomy, part node names, label, the doll part a
// wearable sits on (tools/dress.mjs, `wornOnParts`), what a worn shell covers and how far footwear lifts the foot, the authored mass and drawn volume of a model whose tool authors them, and credits, every vehicle's
// placements file and tags (tools/placements.mjs), every sound row's data and baked files (tools/sounds.mjs), and every
// pack's dependencies (tools/packs.mjs) and produced files,
// every retired model id mapped to its current one (models/renames.json), and the finish library a vehicle site names
// its paint from, and the version of the shader surfaces its materials' extras are written for. tools/build.mjs writes it; tools/check-built.mjs holds every fresh build to it.
// Credits come from REUSE.toml: the last annotation whose path matches the file names its author and licence.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { outputPath, undeclaredDirectories } from './layout.mjs';
import { SURFACE_CONTRACT } from './packages/surfaces/src/contract.ts';
import { manifestTaxonomy } from './taxonomy.mjs';

/** @typedef {{ path: string[]; 'SPDX-FileCopyrightText': string; 'SPDX-License-Identifier': string }} Annotation */
/** @typedef {(path: string) => { author: string; licence: string }} Credit A repo path's author and licence. */
/** @typedef {{ mob: string; bone: string; without: unknown; index: string }} SeveredCut */
/**
 * A built model as the manifest lists it; paths are logical under the pack.
 * @typedef {object} ManifestModel
 * @property {string} id
 * @property {unknown} [title]
 * @property {string} kind
 * @property {string} pack
 * @property {string} path
 * @property {{ pack: string; path: string } | undefined} [smooth]
 * @property {unknown} [taxonomy]
 * @property {readonly string[] | undefined} [nodes]
 * @property {{ path: string; kit: { id: string; revision: number } } | undefined} [building]
 * @property {unknown} [label]
 * @property {object | undefined} [wornOn]
 * @property {readonly string[] | undefined} [covers]
 * @property {number | undefined} [soleLift]
 * @property {number | undefined} [massKg]
 * @property {number | undefined} [volumeM3]
 * @property {string | undefined} [clips]
 * @property {string | undefined} [body]
 * @property {string | undefined} [genome]
 * @property {SeveredCut | undefined} [cut]
 */
/**
 * A severed-part plan (tools/severedParts.mjs).
 * @typedef {object} SeveredPlan
 * @property {string} mob
 * @property {string} pack
 * @property {string} index
 * @property {readonly { bone: string; without: unknown; id: string; title: unknown; path: string; taxonomy: unknown }[]} parts
 */
/** @typedef {ReturnType<typeof soundManifest>['sounds'][number]} ManifestSound */
/** @typedef {{ id: string; title: unknown; pack: string; path: string; tags: unknown }} ManifestVehicle */
/** @typedef {{ id: string; pack: string; path: string; rig: string }} ManifestMotion */
/** @typedef {{ id: string; pack: string; rig: string; models: Record<string, string> }} ManifestDoll */
/** @typedef {{ id: string; revision: number; pack: string; path: string }} ManifestBuildingKit */
/**
 * What of a manifest its file list and the tree check read.
 * @typedef {object} ManifestFiles
 * @property {Readonly<Record<string, { files: readonly string[] }>>} packs
 * @property {readonly { pack: string; smooth?: { pack: string } | undefined }[]} models
 * @property {readonly { pack: string }[]} sounds
 */

const repo = resolve(import.meta.dirname, '..');
export const MANIFEST = 'manifest.json';
export const RENAMES = 'models/renames.json';
const ANNOTATION_KEYS = /** @type {const} */ (['path', 'SPDX-FileCopyrightText', 'SPDX-License-Identifier']);

/**
 * REUSE's path globs: `**` crosses directories, `*` and `?` do not.
 * @param {string} glob
 */
const globPattern = (glob) =>
  new RegExp(
    `^${glob
      .split(/(\*\*|\*|\?)/)
      .map((piece) => {
        if (piece === '**') return '.*';
        if (piece === '*') return '[^/]*';
        if (piece === '?') return '[^/]';
        return piece.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      })
      .join('')}$`,
  );

const STRING = /^"((?:[^"\\]|\\.)*)"$/;
/**
 * @param {string} text
 * @param {string} where
 * @returns {string}
 */
const unquote = (text, where) => {
  const match = STRING.exec(text);
  if (!match) throw new Error(`REUSE.toml ${where}: expected a string, read ${text}`);
  return JSON.parse(`"${match[1]}"`);
};
/**
 * @param {string} text
 * @param {string} where
 */
const stringList = (text, where) => {
  if (!text.startsWith('[') || !text.endsWith(']')) throw new Error(`REUSE.toml ${where}: expected a list of strings`);
  return text
    .slice(1, -1)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => unquote(item, where));
};

/**
 * An annotation that holds every key, or a thrown error naming the first it lacks.
 * @param {Partial<Annotation>} annotation
 * @returns {Annotation}
 */
function completeAnnotation(annotation) {
  const { path, 'SPDX-FileCopyrightText': author, 'SPDX-License-Identifier': licence } = annotation;
  const missing = ANNOTATION_KEYS.find((key) => !Object.hasOwn(annotation, key));
  if (missing !== undefined || path === undefined || author === undefined || licence === undefined)
    throw new Error(`REUSE.toml: an annotation has no ${missing}`);
  return { ...annotation, path, 'SPDX-FileCopyrightText': author, 'SPDX-License-Identifier': licence };
}

// The annotations of REUSE.toml, read strictly: a line the reader does not know is an error, never skipped.
export function readAnnotations(root = repo) {
  /** @type {Partial<Annotation>[]} */
  const annotations = [];
  /** @type {Partial<Annotation> | undefined} */
  let current;
  readFileSync(join(root, 'REUSE.toml'), 'utf8')
    .split('\n')
    .forEach((raw, index) => {
      const line = raw.trim();
      const where = `line ${index + 1}`;
      if (line === '' || line.startsWith('#')) return;
      if (line === '[[annotations]]') {
        current = {};
        annotations.push(current);
        return;
      }
      const [, key, value] = /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/.exec(line) ?? [];
      if (key === undefined || value === undefined) throw new Error(`REUSE.toml ${where}: unknown line ${line}`);
      if (current === undefined) {
        if (key !== 'version' || value !== '1')
          throw new Error(`REUSE.toml ${where}: only version = 1 precedes the annotations`);
        return;
      }
      if (Object.hasOwn(current, key)) throw new Error(`REUSE.toml ${where}: ${key} given twice`);
      if (key === 'path') current.path = value.startsWith('[') ? stringList(value, where) : [unquote(value, where)];
      else if (key === 'SPDX-FileCopyrightText' || key === 'SPDX-License-Identifier')
        current[key] = unquote(value, where);
      else throw new Error(`REUSE.toml ${where}: unknown key ${key}`);
    });
  return annotations.map(completeAnnotation).map((annotation) => ({
    ...annotation,
    patterns: annotation.path.map(globPattern),
  }));
}

/**
 * path (relative to the repo) -> { author, licence } of the last annotation that matches it.
 * @returns {Credit}
 */
export function readCredits(root = repo) {
  const annotations = readAnnotations(root);
  return (path) => {
    const annotation = annotations.findLast(({ patterns }) => patterns.some((pattern) => pattern.test(path)));
    if (!annotation) throw new Error(`no REUSE.toml annotation covers ${path}`);
    return { author: annotation['SPDX-FileCopyrightText'], licence: annotation['SPDX-License-Identifier'] };
  };
}

/**
 * Retired model id -> the current id that replaces it.
 * @returns {Readonly<Record<string, string>>}
 */
export const readRenames = (root = repo) => JSON.parse(readFileSync(join(root, RENAMES), 'utf8'));

/**
 * A consumer moving its pin over several releases maps each id it holds with one lookup, so every target is a current
 * id; a retired id that named a model again would make that lookup ambiguous.
 * @param {Readonly<Record<string, string>>} renames
 * @param {readonly { id: string }[]} models
 */
function renameProblems(renames, models) {
  const current = new Set(models.map(({ id }) => id));
  return Object.entries(renames).flatMap(([from, to]) => [
    ...(current.has(from) ? [`${from} is retired, yet names a current model`] : []),
    ...(current.has(to) ? [] : [`${from} is renamed to ${to}, which is not a current model`]),
  ]);
}

// Every mob row is an actor model with a body, pose clips and the genome it was built from. Every severed-part plan
// (tools/severedParts.mjs) adds its pack's index and a model per part, which names the mob type and bone it is cut at
// and the cut points below already gone.
/**
 * @param {readonly MobRow[]} rows
 * @param {readonly SeveredPlan[]} [severed]
 */
export function mobManifest(rows, severed = []) {
  /** @type {ManifestModel[]} */
  const models = [];
  /** @type {string[]} */
  const files = [];
  for (const row of rows) {
    models.push({
      id: row.id,
      title: row.title,
      kind: 'mob',
      pack: row.pack,
      path: row.glb,
      clips: row.clips,
      body: row.body,
      genome: row.genome,
    });
    files.push(...[row.glb, row.body, row.clips, row.genome].map((path) => outputPath(row.pack, path)));
  }
  for (const { mob, pack, index, parts } of severed) {
    files.push(outputPath(pack, index));
    for (const { bone, without, id, title, path, taxonomy } of parts) {
      models.push({ id, title, kind: 'severed-part', pack, path, taxonomy, cut: { mob, bone, without, index } });
      files.push(outputPath(pack, path));
    }
  }
  return { models, files };
}

/**
 * The id of the object or surface a sound row is the sound of, or a thrown error naming the row.
 * @param {SoundRow} sound
 * @param {'object' | 'surface'} field
 */
function soundPartId(sound, field) {
  const value = sound.row[field];
  const id = typeof value === 'object' && value !== null && 'id' in value ? value.id : undefined;
  if (typeof id !== 'string') throw new Error(`sound ${sound.id}: its row's ${field} has no id`);
  return id;
}

/**
 * Every sound row is its row as data and one audio file per seed, all baked at the one sample rate.
 * @param {readonly SoundRow[]} rows
 * @param {number} sampleRate
 */
export function soundManifest(rows, sampleRate) {
  const sounds = rows.map((sound) => ({
    id: sound.id,
    pack: sound.pack,
    object: soundPartId(sound, 'object'),
    surface: soundPartId(sound, 'surface'),
    sampleRate,
    row: sound.data,
    variants: sound.variants,
  }));
  const files = rows.flatMap(({ pack, data, variants }) => [
    outputPath(pack, data),
    ...variants.map(({ path }) => outputPath(pack, path)),
  ]);
  return { sounds, files };
}

/**
 * @param {string} a
 * @param {string} b
 */
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const MODEL_FILES = /** @type {const} */ (['clips', 'body', 'genome']);

/**
 * @param {object} manifest
 * @param {readonly ManifestModel[]} manifest.models
 * @param {readonly ManifestBuildingKit[]} [manifest.buildingKits] each kit a building module names
 * @param {readonly ManifestVehicle[]} [manifest.vehicles] each vehicle's placements
 * @param {readonly ManifestDoll[]} [manifest.dolls] each doll and its rig file
 * @param {readonly ManifestMotion[]} [manifest.motions] each baked clip set
 * @param {readonly ManifestSound[]} [manifest.sounds] as soundManifest gives them
 * @param {Readonly<Record<string, readonly string[]>>} [manifest.dependsOn] pack -> the packs it depends on
 * @param {readonly string[]} manifest.files every produced file as <pack>/<logical path>
 * @param {Credit} manifest.credit
 * @param {Readonly<Record<string, string>>} [manifest.renames] retired id -> current id
 * @param {Readonly<Record<string, unknown>>} [manifest.finishes] finish id -> its glTF material
 */
export function buildManifest({
  models,
  buildingKits = [],
  vehicles = [],
  dolls = [],
  motions = [],
  sounds = [],
  dependsOn = {},
  files,
  credit,
  renames = {},
  finishes = {},
}) {
  /** @type {Record<string, { dependsOn: readonly string[]; files: string[] }>} */
  const packs = {};
  for (const file of [...new Set(files)].sort(byText)) {
    const [pack = '', ...rest] = file.split('/');
    outputPath(pack, rest.join('/'));
    packs[pack] ??= { dependsOn: (Object.hasOwn(dependsOn, pack) ? dependsOn[pack] : undefined) ?? [], files: [] };
    packs[pack].files.push(rest.join('/'));
  }
  for (const [pack, { dependsOn: targets }] of Object.entries(packs)) {
    for (const target of targets)
      if (!Object.hasOwn(packs, target)) throw new Error(`${pack}: depends on ${target}, which the tree does not hold`);
  }
  const known = new Set(files);
  const kits = new Map();
  for (const kit of buildingKits) {
    const key = `${kit.id}@${kit.revision}`;
    if (kits.has(key)) throw new Error(`duplicate building kit ${key}`);
    if (!known.has(outputPath(kit.pack, kit.path))) throw new Error(`building kit ${key}: not a produced file`);
    kits.set(key, kit);
  }
  const ids = new Set();
  const entries = [...models]
    .sort((a, b) => byText(a.pack, b.pack) || byText(a.id, b.id))
    .map((model) => {
      const file = outputPath(model.pack, model.path);
      if (!known.has(file)) throw new Error(`${model.id}: ${file} is not a produced file`);
      for (const role of MODEL_FILES) {
        const path = model[role];
        if (path !== undefined && !known.has(outputPath(model.pack, path)))
          throw new Error(`${model.id}: its ${role} is not a produced file`);
      }
      if (model.cut !== undefined && !known.has(outputPath(model.pack, model.cut.index)))
        throw new Error(`${model.id}: its severed index is not a produced file`);
      if (model.smooth !== undefined && !known.has(outputPath(model.smooth.pack, model.smooth.path)))
        throw new Error(`${model.id}: its smooth copy is not a produced file`);
      if (model.building !== undefined) {
        if (!known.has(outputPath(model.pack, model.building.path)))
          throw new Error(`${model.id}: building sidecar is not a produced file`);
        const { id, revision } = model.building.kit;
        const kit = kits.get(`${id}@${revision}`);
        if (!kit || kit.pack !== model.pack) throw new Error(`${model.id}: unknown building kit ${id}@${revision}`);
      }
      const key = `${model.pack}/${model.id}`;
      if (ids.has(key)) throw new Error(`${model.id}: two models of one id in ${model.pack}`);
      ids.add(key);
      return {
        id: model.id,
        title: model.title,
        kind: model.kind,
        pack: model.pack,
        path: model.path,
        ...(model.smooth === undefined ? {} : { smooth: { pack: model.smooth.pack, path: model.smooth.path } }),
        ...manifestTaxonomy(model.taxonomy),
        ...(model.nodes === undefined ? {} : { nodes: [...model.nodes] }),
        ...(model.building === undefined ? {} : { building: model.building }),
        ...(model.label === undefined ? {} : { label: model.label }),
        ...(model.wornOn === undefined ? {} : { wornOn: { ...model.wornOn } }),
        ...(model.covers === undefined ? {} : { covers: [...model.covers] }),
        ...(model.soleLift === undefined ? {} : { soleLift: model.soleLift }),
        ...(model.massKg === undefined
          ? {}
          : { massKg: model.massKg, ...(model.volumeM3 === undefined ? {} : { volumeM3: model.volumeM3 }) }),
        ...(model.clips === undefined ? {} : { clips: model.clips }),
        ...(model.body === undefined ? {} : { body: model.body }),
        ...(model.genome === undefined ? {} : { genome: model.genome }),
        ...(model.cut === undefined ? {} : { cut: { ...model.cut } }),
        credits: credit(`built/${file}`),
      };
    });
  const vehicleIds = new Set();
  const vehicleEntries = [...vehicles]
    .sort((a, b) => byText(a.id, b.id))
    .map(({ id, title, pack, path, tags }) => {
      const file = outputPath(pack, path);
      if (!known.has(file)) throw new Error(`vehicle ${id}: ${file} is not a produced file`);
      if (vehicleIds.has(id)) throw new Error(`vehicle ${id}: placed twice`);
      vehicleIds.add(id);
      return { id, title, pack, path, ...manifestTaxonomy({ tags }), credits: credit(`built/${file}`) };
    });
  const dollEntries = [...dolls]
    .sort((a, b) => byText(a.id, b.id))
    .map(({ id, pack, rig, models: parts }) => {
      if (!known.has(outputPath(pack, rig)))
        throw new Error(`doll ${id}: ${outputPath(pack, rig)} is not a produced file`);
      return { id, pack, rig, models: parts };
    });
  const motionEntries = [...motions]
    .sort((a, b) => byText(a.id, b.id))
    .map(({ id, pack, path, rig }) => {
      for (const file of [path, rig])
        if (!known.has(outputPath(pack, file)))
          throw new Error(`motions ${id}: ${outputPath(pack, file)} is not a produced file`);
      return { id, pack, path, rig };
    });
  const soundIds = new Set();
  const soundEntries = [...sounds]
    .sort((a, b) => byText(a.pack, b.pack) || byText(a.id, b.id))
    .map((sound) => {
      const paths = [sound.row, ...sound.variants.map(({ path }) => path)];
      for (const path of paths)
        if (!known.has(outputPath(sound.pack, path)))
          throw new Error(`sound ${sound.id}: ${outputPath(sound.pack, path)} is not a produced file`);
      if (soundIds.has(`${sound.pack}/${sound.id}`))
        throw new Error(`sound ${sound.id}: two sounds of one id in ${sound.pack}`);
      soundIds.add(`${sound.pack}/${sound.id}`);
      return { ...sound, credits: credit(`built/${outputPath(sound.pack, sound.row)}`) };
    });
  const stale = renameProblems(renames, models);
  if (stale.length) throw new Error(`${RENAMES}: ${stale.join('; ')}`);
  return {
    _doc: "Every model the built tree holds, every vehicle's placements and every produced file under its pack, written by tools/build.mjs; paths are logical under <pack>/. smooth: the same model drawn as its authored meshes rather than voxels, the GLB at path under its pack, a pack of its own that depends on the model's; every other field of the entry, and the sidecar, is the voxel file's, so massKg and volumeM3 weigh the voxels and every solid-derived anchor, grip and collision shape is placed on them, within half the model's voxel grain of the smooth surface; building placement datums are instead authored coordinates shared by both representations; the copy has the same part nodes, skin and piece regions. A model drawn only as voxels, such as a mob or a severed part, has none. title: what the model is called wherever it is listed or printed, authored with the model. category and tags: the model's shelf and facet terms, defined in models/taxonomy.json. keywords: further search words for the model, kebab-case, of which models/taxonomy.json lists the curated ones. nodes: the GLB part node names of the resolved assembly. building: a locator for the canonical model sidecar and its kit id/revision; coordinates in its building block are authored placement facts shared by voxel and smooth files, not voxel-derived datums. buildingKits: each referenced kit's id, revision, pack and path, whose grid conventions and qualified join profiles the module names; these are geometric assembly semantics, not navigation or interaction. label: the text printed on the model and the rectangle it fills, in metres in the GLB frame; consumers draw it, the GLB has no lettering. massKg: a model's authored mass, the sum of its parts'. volumeM3: the volume of the voxels it is drawn with, in cubic metres, from which a density follows, left out by a tool that does not measure it. A model whose parts are not all weighed has neither. genome: on a mob, its genome file, every value the generator drew for it after its row narrowed the template, so two releases' bodies of one id can be told re-rolled from rebuilt. cut: on a severed part, the mob type and bone it is cut at, the cut points below it already gone when it is cut, given by their top-most ones, and its pack's severed index, which holds every cut point's parts by mob type and bone, each with those cut points and its neutral model sidecar, so a game finds the item each cut leaves from the bone it severs and the cut points already gone below it, and no mass that already left as another part is counted twice; every variant of the type shares the type's parts. wornOn: on a worn piece and on a wearable with no worn pieces, the doll part it sits on, which a bone of the motions' rig binds (bones[].bind.part, with its side and its site in the rig's doll), so a consumer seats it on that bone. A worn piece is drawn in the part's frame, in every copy of the part, the left one mirrored; a piece fitted over other clothing, <item>_worn_<layer> such as a vest over a jacket, sits where its <item>_worn twin does, one layer out. A wearable with no worn pieces sits whole on one copy of the part, which side names where the doll has two (the bind.side of that copy's bone), or across both copies with both: true; with anchor, its own anchor of that name, or its origin if it has none, goes to the anchor of that name on the doll's bust, the model at the rig's first doll site, an anchor that lies on the part. covers: on a worn shell, what of the doll a consumer stops drawing while it is worn, so skin under the shell never shows through: the doll part it is drawn on, or regions of that part, each drawn on the doll's copy of the part as the GLB primitives whose extras.piece names it. The torso is cut into trunk and shoulders and the foot into ankle and sole; models/dressing.libsonnet, each doll's regions, holds the cut. A consumer hides what every shell it wears declares, on the copy each shell is fitted to. soleLift: on footwear, in metres, how far its sole stands the bare foot above the ground, since the sole lies under the foot; a consumer stands a figure that much higher, by the largest lift among what it wears. dependsOn: the packs a pack refers to, which a consumer loads with it. vehicles: each vehicle's title, pack and placements file, which holds its sites, the model id of the part at each site, its position in the vehicle frame, whether it is a mirrored far-side twin and the finish its copy is painted when the part takes paint, a key of finishes; tags: its body's tags with its own added. dolls: each doll a figure is built as, its id, the pack of its models, its rig file under that pack, and the models of its parts, bust and arm and leg, the limbs hung on each side of the bust; a motions entry's rig is the rig file of the doll its clips pose. motions: each set of clips baked for a figure built of several models, its pack, its clips file and its rig file, the bones its clips' frames turn and the site of each model on them. A rig bone's node is the joint node a game builds for it and a clip's quaternion turns: at the bone's head, its rest rotation node.rotation (a quaternion [x, y, z, w] of its axes in the model's). bind.rest is where the bound part's own model frame sits in that node: a point q of the part lands at rotation * (scale * q) + translation in the node, scale being [-1, 1, 1] for a mirrored copy, so a piece drawn in the part's frame is seated on the node by that one offset. bind.box bounds the part at rest in the model frame. A part its doll rests turned off the way its model hangs, the player's arms swung out from the shoulders clear of the trunk or a T-posed arm, carries bind.turn, the quaternion its site turns the part by after any mirror, and bind.hanging, its box exact as it hangs before that turn (box) and the point the turn swings it about (about); a clip turns each bone from that turned rest.The bone's frame is another thing, the joint-limit frame its pose angles are read in, which a game need not build. A clip's held seat is given in the bone's rest model frame, not in the node. sounds: each sound row, the object and surface it is the sound of, so a consumer picks it by the surface an object lands on, its row as data, which the impact synth renders to the same samples at the same sample rate, and one Ogg Vorbis file per seed, a take of it baked at that rate. credits: from REUSE.toml. renames: every model id an earlier release held and this one does not, mapped to the current id that replaces it, so one lookup moves an id across any number of releases. finishes: every finish a site may name, as the glTF material a paintable surface in that finish carries, which a consumer puts in place of each material the copy marks paintable. surfaceContract: the version of the shader surfaces (tools/packages/surfaces) that every GLB material's extras.surface is written for, so a game whose shaders read another version knows the looks may not fit them.",
    packs: Object.fromEntries(Object.entries(packs).sort(([a], [b]) => byText(a, b))),
    models: entries,
    ...(buildingKits.length === 0
      ? {}
      : { buildingKits: [...buildingKits].sort((a, b) => byText(a.id, b.id) || a.revision - b.revision) }),
    vehicles: vehicleEntries,
    dolls: dollEntries,
    motions: motionEntries,
    sounds: soundEntries,
    renames: Object.fromEntries(Object.entries(renames).sort(([a], [b]) => byText(a, b))),
    finishes: Object.fromEntries(Object.entries(finishes).sort(([a], [b]) => byText(a, b))),
    surfaceContract: SURFACE_CONTRACT,
  };
}

/** @param {object} manifest */
export const manifestJson = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

/**
 * Every file a manifest names, as a repo path under built/, the manifest itself included.
 * @param {ManifestFiles} manifest
 */
export function manifestFiles(manifest) {
  return new Set([
    `built/${MANIFEST}`,
    ...Object.entries(manifest.packs).flatMap(([pack, { files }]) =>
      files.map((file) => `built/${outputPath(pack, file)}`),
    ),
  ]);
}

// How a fresh tree departs from its manifest and the declared packs (layout.mjs, declaredPacks): nothing flat but the
// manifest, the manifest names exactly the produced files, every directory is a declared pack, and every declared pack
// has a model or a sound, so a pack whose rows the production build skips is caught. files: the tree's files under built/.
/**
 * @param {object} tree
 * @param {readonly string[]} tree.files
 * @param {ManifestFiles} tree.manifest
 * @param {ReadonlySet<string>} tree.declared
 */
export function treeDifferences({ files, manifest, declared }) {
  const produced = new Set(files);
  const named = manifestFiles(manifest);
  const modelled = new Set([
    ...[...manifest.models, ...manifest.sounds].map((entry) => entry.pack),
    ...manifest.models.flatMap((entry) => (entry.smooth === undefined ? [] : [entry.smooth.pack])),
  ]);
  return [
    ...files
      .filter((file) => file.split('/').length === 2 && file !== `built/${MANIFEST}`)
      .map((file) => `flat under built/: ${file}`),
    ...files.filter((file) => !named.has(file)).map((file) => `produced, not in the manifest: ${file}`),
    ...[...named].filter((file) => !produced.has(file)).map((file) => `in the manifest, not produced: ${file}`),
    ...undeclaredDirectories(files, declared).map((directory) => `undeclared directory: ${directory}`),
    ...[...declared]
      .filter((pack) => !modelled.has(pack))
      .map((pack) => `declared pack without a model or sound: ${pack}`),
  ].sort(byText);
}
