// Builds the showcase site into _site/: the page, the models of a built tree and a models.json that lists them with
// their category, tags, keywords, printed label, sidecar and mass, and the components a model comes apart into
// (tools/components.mjs), the vehicles the tree places with their mass and the assemblies the kits build with the model
// at each of their sites, the sites that dress each wearable on the doll, and the vocabulary's meanings for the page's
// labels (models/taxonomy.json). It serves the tool pages site/tools.json lists and links them from the index.
// Usage: node site/build.mjs [--built dir] [--no-tree] [--require-viewers] [outDir]; the tree defaults to built/. --no-tree
// leaves the tree's unchanged files out, for a local server that reads them from the tree itself (tools/model-sheet.mjs).
// --require-viewers fails on an unbuilt viewer, so a deploy never drops one. No dependencies; the page loads
// three.js from a CDN. The models are the GLB models the tree's manifest.json names (tools/manifest.mjs), at their
// pack paths.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { applyJointDelta, applyMotion, applyOverlay, decodeFrame, sampleClip } from '../tools/actorCompose.mjs';
import { readAssemblies } from '../tools/assemblies.mjs';
import { formOf, modelComponents } from '../tools/components.mjs';
import { isWearable, modelBox, modelMeshes, readDoll, readDressing, wornSites } from '../tools/dress.mjs';
import { readMobRows } from '../tools/layout.mjs';
import { pressCheckClip, readPressCheck } from '../tools/press-check.mjs';
import { coverGaps, dollRig, readRigContent } from '../tools/dollRig.mjs';
import { VOCABULARY } from '../tools/taxonomy.mjs';
import { NAV_MARK, readTools, toolLinks, unlinkedTools, viewerDist } from './tools.mjs';
import { mat3ToQuat } from '../tools/packages/mobgen/src/core/math.ts';


const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { values, positionals } = parseArgs({ allowPositionals: true, options: { built: { type: 'string', default: join(root, 'built') }, 'no-tree': { type: 'boolean', default: false }, 'require-viewers': { type: 'boolean', default: false } } });
const out = resolve(root, positionals[0] ?? '_site');
const built = resolve(values.built);
const POSES = 'models/poses';

const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
// A walk clip states its stride in metres; the viewer paces it by the authored walk speed of the row that baked it.
const walkSpeeds = new Map(readMobRows(root).map((row) => [`${row.pack}/${row.clips}`, row.walk_speed]));
const walkSpeedOf = (clips) => {
  const speed = walkSpeeds.get(clips);
  if (!(speed > 0)) throw new Error(`${clips}: no models/mobs.json row with a positive walk_speed`);
  return speed;
};
// Each model's sidecar, keyed by the model file it names.
const sidecars = new Map(Object.entries(manifest.packs).flatMap(([pack, { files }]) => files
  .filter((f) => f.endsWith('.model.json'))
  .map((f) => [`${pack}/${JSON.parse(readFileSync(join(built, pack, f), 'utf8')).file}`, { sidecar: `${pack}/${f}` }])));
const models = manifest.models
  .filter(({ path }) => path.endsWith('.glb'))
  .map(({ id, pack, path, category, tags, keywords, label, clips, body, covers, massKg, volumeM3 }) => ({
    id,
    category: category ?? null,
    label: label ?? null,
    tags: tags ?? {},
    keywords: keywords ?? [],
    file: `${pack}/${path}`,
    clips: clips === undefined ? null : `${pack}/${clips}`,
    body: body === undefined ? null : `${pack}/${body}`,
    covers,
    massKg,
    volumeM3,
  }))
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
  .map(({ id, file, category, tags, keywords, label, clips, body, covers, massKg, volumeM3 }) => ({
    id,
    file,
    bytes: statSync(join(built, file)).size,
    category,
    tags,
    keywords,
    label,
    clips,
    body,
    ...(clips ? { walkSpeed: walkSpeedOf(clips) } : {}),
    ...(covers ? { covers } : {}),
    ...sidecars.get(file),
    ...(massKg === undefined ? {} : { massKg, volumeM3 }),
  }));

// A site's finish as the browser repaints with it: the manifest's material for that finish, as a game reads it.
const paintOf = (finish) => {
  if (!Object.hasOwn(manifest.finishes, finish)) throw new Error(`finish ${finish} is not in the manifest's finishes`);
  const { baseColorFactor: [r, g, b, opacity], metallicFactor: metallic, roughnessFactor: roughness } = manifest.finishes[finish].pbrMetallicRoughness;
  return { linear: [r, g, b], metallic, roughness, opacity };
};

// The model at each of a vehicle's or an assembly's sites, as the browser places it.
const modelsById = new Map(models.map((model) => [model.id, model]));

// Each wearable worn on the doll, as the sites the browser composes its worn view from (tools/dress.mjs). A tree with no
// wearable, such as one of mobs alone, needs no doll.
const wearables = new Set(models.filter((model) => isWearable(model, models)));
const dressing = readDressing(root);
const doll = wearables.size > 0 ? readDoll(built, manifest, dressing) : undefined;
const boxOf = (id) => modelBox(readFileSync(join(built, modelsById.get(id).file)));
// A wearable shows itself worn beside its loose views, and any other model that comes apart shows its components apart.
const apart = (model) => {
  const components = modelComponents(readFileSync(join(built, model.file)));
  return components ? { ...model, components } : model;
};
const shown = models.map((model) => {
  const entry = wearables.has(model) ? { ...model, worn: wornSites(model, { dressing, doll, models, boxOf }) } : apart(model);
  return { ...entry, form: formOf(entry) };
});
const missingParts = (sites) => sites.filter(({ part }) => !modelsById.has(part)).map(({ part }) => part);
const placedSites = (sites) => sites.map(({ id: site, part, at, mirror, finish }) => ({
  site,
  model: part,
  at,
  ...(mirror ? { mirror } : {}),
  ...(finish ? { paint: paintOf(finish) } : {}),
}));

// A vehicle weighs its sites' models together and fills the volume of their voxels. A figure comes only when every
// site's model has it, rather than a total short of what the vehicle holds.
const vehiclePhysical = (sites) => {
  const parts = sites.map(({ model }) => modelsById.get(model));
  const total = (key) => (parts.some((part) => part[key] === undefined) ? {} : { [key]: parts.reduce((sum, part) => sum + part[key], 0) });
  return { ...total('massKg'), ...total('volumeM3') };
};

// Each vehicle the manifest places (tools/placements.mjs), with its tags and the model at each site; a vehicle has no
// keywords of its own.
const vehicles = manifest.vehicles.map(({ id, pack, path, tags }) => {
  if (modelsById.has(id)) throw new Error(`vehicle ${id} shares its id with a model`);
  const { sites } = JSON.parse(readFileSync(join(built, pack, path), 'utf8'));
  const missing = missingParts(sites);
  if (missing.length > 0) throw new Error(`vehicle ${id} places models the tree does not hold: ${missing.join(' ')}`);
  const placed = placedSites(sites);
  return { id, placements: `${pack}/${path}`, tags: tags ?? {}, keywords: [], sites: placed, form: formOf({ sites: placed }), ...vehiclePhysical(placed) };
});

// Each assembly the kits build (tools/assemblies.mjs), for the review page to draw on its own. The kits are read from
// source, so a tree built before a kit gained a part leaves out the assemblies it cannot place.
const vehicleIds = new Set(vehicles.map(({ id }) => id));
const assemblies = readAssemblies(root)
  .filter(({ sites }) => missingParts(sites).length === 0)
  .map(({ id, sites }) => {
    if (modelsById.has(id) || vehicleIds.has(id)) throw new Error(`assembly ${id} shares its id with a model or vehicle`);
    return { id, sites: placedSites(sites) };
  });

// The browser cannot import actorCompose: it reaches mobgen TypeScript and Jsonnet source installation, while this
// dependency-free site has no bundler. Compose here in Node so the viewer only needs plain pose-frame playback
// (site/clipFrames.mjs, which this build and the pages read).
const poseFrame = (pose) => ({ root: [...pose.root], rotations: Object.fromEntries(Object.entries(pose.rotations).map(([id, r]) => [id, mat3ToQuat(r)])) });
const idleAt = (set, body, time) => {
  const idle = set.idle?.slack ?? set.idle?.aggravated ?? set.idle;
  if (idle.kind === 'pose') return decodeFrame(sampleClip(idle, idle.loop ? time : time * (idle.durationSimSeconds ?? 1)));
  return applyMotion(decodeFrame(idle.base), idle.motion, time, body.seed);
};
const plainClip = (clip, set, body, stance) => {
  if (clip.kind === 'pose') return clip;
  const frames = clip.frames.map((_, i) => {
    const normalized = clip.loop ? i / clip.frames.length : i / (clip.frames.length - 1);
    const time = normalized * (clip.durationSimSeconds ?? 1);
    const base = idleAt(set, body, normalized);
    const pose = clip.kind === 'overlay'
      ? applyOverlay(body, base, clip, time, 1, stance)
      : applyJointDelta(body, base, clip, clip.cursor === 'gaitPhase' ? normalized * 2 * Math.PI : time, { speed: 1, side: 0 });
    return poseFrame(pose);
  });
  return { kind: 'pose', loop: Boolean(clip.loop), ...(clip.periodSimSeconds === undefined ? {} : { periodSimSeconds: clip.periodSimSeconds }), ...(clip.strideMetres === undefined ? {} : { strideMetres: clip.strideMetres }),...(clip.durationSimSeconds === undefined ? {} : { durationSimSeconds: clip.durationSimSeconds }), ...(clip.durationRealSeconds === undefined ? {} : { durationRealSeconds: clip.durationRealSeconds }), ...(clip.cycles === undefined ? {} : { cycles: clip.cycles }), frames };
};
const plainSet = (set, body, stance) => Object.fromEntries(Object.entries(set).map(([name, clip]) => {
  if (name === 'idle' && !clip.kind) {
    const source = clip.slack ?? clip.aggravated;
    return [name, { kind: 'pose', loop: false, frames: [source.base] }];
  }
  if (!clip.kind) return [name, Object.fromEntries(Object.entries(clip).map(([key, value]) => [key, plainClip(value, set, body, stance)]))];
  return [name, plainClip(clip, set, body, stance)];
}));
const plainClips = (clips, body) => ({
  ...(clips.standing ? { standing: plainSet(clips.standing, body, 'standing') } : {}),
  ...(clips.crawling ? { crawling: plainSet(clips.crawling, body, 'crawling') } : {}),
  ...(!clips.standing && !clips.crawling ? plainSet(clips, body, 'standing') : {}),
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'app.js', 'filter.mjs', 'combobox.mjs', 'render.mjs', 'explode.mjs', 'fabric.mjs', 'modelFrame.mjs', 'clipFrames.mjs', 'style.css', 'look.mjs', 'lookOptions.mjs', 'tile.mjs', 'kinematics.mjs', 'poseFile.mjs', 'clearance.mjs', 'fingers.mjs', 'hiding.mjs', 'skin.mjs', 'pose.mjs']) cpSync(join(here, f), join(out, f));
// The doll's rig and the shared poses, for the pose page (site/pose.mjs) and the pose sheets (tools/pose-sheet.mjs).
if (doll) {
  const poses = readdirSync(join(root, POSES)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length)).sort();
  // `doll` is the bare doll's sites, so the page can pose it undressed; a wearable's worn sites extend them. `clips`
  // names the clip actor's plain clips and its walk speed, which paces its walk.
  const rig = dollRig(readRigContent(root), doll, dressing);
  // A worn piece hides what it declares it covers, so a declaration it does not enclose would open the body to view.
  const gaps = shown.filter(({ worn }) => worn?.some(({ covers }) => covers))
    .flatMap(({ worn }) => coverGaps(rig, worn, (id, keep) => modelMeshes(readFileSync(join(built, modelsById.get(id).file)), keep)));
  if (gaps.length > 0) {
    const where = ({ piece, side, name, open, at }) => `${piece} (${side}) covers ${name}, but ${open === 'nothing' ? 'it names nothing there' : `${open} samples show, one at [${at.map((x) => x.toFixed(3))}]`}`;
    throw new Error(`worn pieces would hide body they do not enclose:\n${gaps.map(where).join('\n')}`);
  }
  const actor = modelsById.get(rig.clips);
  if (!actor?.clips) throw new Error(`rig ${rig.id}: the tree holds no clips of ${rig.clips}`);
  // The press check plays on the page as a clip through its key frames' pose files, each at its own time.
  const pressCheck = pressCheckClip(readPressCheck(root));
  const unwritten = [...new Set(pressCheck.keys.map(({ fixture }) => fixture))].filter((name) => !poses.includes(name));
  if (unwritten.length > 0) throw new Error(`press check frames with no pose file (node tools/press-check.mjs): ${unwritten.join(', ')}`);
  writeFileSync(join(out, 'rig.json'), JSON.stringify({ ...rig, clips: { file: actor.clips, walkSpeed: actor.walkSpeed }, doll: doll.sites, poses, sequences: { 'press check': pressCheck } }));
  mkdirSync(join(out, 'poses'));
  for (const name of poses) cpSync(join(root, POSES, `${name}.json`), join(out, 'poses', `${name}.json`));
}
if (!values['no-tree']) cpSync(built, join(out, 'built'), { recursive: true, filter: (src) => !src.endsWith('.import') });
for (const model of models) if (model.clips && model.body) {
  const clips = JSON.parse(readFileSync(join(built, model.clips), 'utf8'));
  const body = JSON.parse(readFileSync(join(built, model.body), 'utf8'));
  mkdirSync(dirname(join(out, 'built', model.clips)), { recursive: true });
  writeFileSync(join(out, 'built', model.clips), JSON.stringify(plainClips(clips, body)));
}
const { categories, facets } = JSON.parse(readFileSync(join(root, VOCABULARY), 'utf8'));
writeFileSync(join(out, 'models.json'), JSON.stringify({ taxonomy: { categories, facets }, models: shown, vehicles, assemblies }));
// A viewer is served only once its package is built (site/build-viewers.mjs), and linked only when served, so a site
// built without the viewers links nothing it lacks.
const listed = readTools(root);
const tools = listed.filter(({ viewer }) => !viewer || existsSync(viewerDist(root, viewer)));
const unbuilt = listed.filter((tool) => !tools.includes(tool)).map(({ viewer }) => viewer);
if (values['require-viewers'] && unbuilt.length > 0) throw new Error(`unbuilt viewers (node site/build-viewers.mjs): ${unbuilt.join(' ')}`);
for (const { page, viewer } of tools) cpSync(page ? join(here, page) : viewerDist(root, viewer), join(out, page ?? viewer), { recursive: true });
const index = readFileSync(join(out, 'index.html'), 'utf8');
if (!index.includes(NAV_MARK)) throw new Error(`site/index.html has no ${NAV_MARK} for the tool links`);
writeFileSync(join(out, 'index.html'), index.replace(NAV_MARK, toolLinks(tools)));
const unlinked = unlinkedTools(out, tools);
if (unlinked.length > 0) throw new Error(`the site serves tool pages that site/tools.json does not list: ${unlinked.join(' ')}`);
writeFileSync(join(out, '.nojekyll'), '');
console.log(`${models.length} models, ${vehicles.length} vehicles and ${assemblies.length} assemblies into ${out}`);
