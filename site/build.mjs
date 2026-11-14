// Builds the showcase site into _site/: the page, the models of a built tree and a models.json that lists them with
// their category, tags, keywords, printed label, sidecar and mass, and the components a model comes apart into
// (tools/components.mjs), the vehicles the tree places with their mass and the assemblies the kits build with the model
// at each of their sites, the sites that dress each wearable on the doll, and the vocabulary's meanings for the page's
// labels (models/taxonomy.json). It serves the tool pages site/tools.json lists and links them from the index.
// Usage: node site/build.mjs [--built dir] [--no-tree] [--require-viewers] [--analytics] [--history file] [outDir]; the tree defaults to built/. --no-tree
// leaves the tree's unchanged files out, for a local server that reads them from the tree itself (tools/model-sheet.mjs).
// --require-viewers fails on an unbuilt viewer, so a deploy never drops one. --analytics adds the visit counter to every
// page the site serves, viewers included (site/analytics.mjs), for the Pages deploy only; the footer it adds names the
// version the build renders (site/version.mjs). No dependencies; the page loads
// three.js from a CDN. The models are the GLB models the tree's manifest.json names (tools/manifest.mjs), at their
// pack paths. --history names the latest release's model-history.json (tools/model-history.mjs), against which each model
// shows the release that introduced it, the one that last changed it and whether this build differs; without it the
// models show no versions.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { applyJointDelta, applyMotion, applyOverlay, decodeFrame, sampleClip } from '../tools/actorCompose.mjs';
import { readAssemblies } from '../tools/assemblies.mjs';
import { formOf, modelComponents } from '../tools/components.mjs';
import { isWearable, modelBox, modelMeshes, readDoll, readDressing, wornSites } from '../tools/dress.mjs';
import { readMobRows } from '../tools/layout.mjs';
import { farSlot, readStowage, stowedPose } from '../tools/stowage.mjs';
import { hashModels, standings, vehicleStanding } from '../tools/model-history.mjs';
import { pressCheckClip, readPressCheck } from '../tools/press-check.mjs';
import { readWields, wieldSequences } from '../tools/wields.mjs';
import { coverGaps, dollRig, readRigContent } from '../tools/dollRig.mjs';
import { VOCABULARY } from '../tools/taxonomy.mjs';
import { addAnalytics } from './analytics.mjs';
import { MIRRORED_AXIS } from './modelFrame.mjs';
import { readVersion, REPOSITORY, versionHtml } from './version.mjs';
import { NAV_MARK, readTools, toolLinks, unlinkedTools, viewerDist } from './tools.mjs';
import { mat3ToQuat } from '../tools/packages/mobgen/src/core/math.ts';


const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { values, positionals } = parseArgs({ allowPositionals: true, options: { built: { type: 'string', default: join(root, 'built') }, 'no-tree': { type: 'boolean', default: false }, 'require-viewers': { type: 'boolean', default: false }, analytics: { type: 'boolean', default: false }, history: { type: 'string' } } });
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
  .map(({ id, title, pack, path, category, tags, keywords, label, clips, body, covers, massKg, volumeM3 }) => ({
    id,
    title,
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
  .map(({ id, title, file, category, tags, keywords, label, clips, body, covers, massKg, volumeM3 }) => ({
    id,
    title,
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
const anchorsOf = (id) => {
  const { sidecar } = modelsById.get(id);
  return sidecar ? JSON.parse(readFileSync(join(built, sidecar), 'utf8')).anchors ?? {} : {};
};
// A wearable shows itself worn beside its loose views, and any other model that comes apart shows its components apart.
const apart = (model) => {
  const components = modelComponents(readFileSync(join(built, model.file)));
  return components ? { ...model, components } : model;
};
const history = values.history && JSON.parse(readFileSync(values.history, 'utf8'));
// Each model and vehicle against the release, through the renames since, by the code that writes the next release's history.
const stands = history && standings(history, hashModels(built, manifest), manifest.renames);
const shown = models.map((model) => {
  const entry = wearables.has(model) ? { ...model, worn: wornSites(model, { dressing, doll, models, boxOf, anchorsOf }) } : apart(model);
  return { ...entry, form: formOf(entry), ...(history ? { history: stands[model.id] } : {}) };
});
const missingParts = (sites) => sites.flatMap(({ part, stowed }) => [part, ...Object.values(stowed ?? {})]).filter((id) => !modelsById.has(id));
const placedSites = (sites) => sites.map(({ id: site, part, at, mirror, finish }) => ({
  site,
  model: part,
  at,
  ...(mirror ? { mirror } : {}),
  ...(finish ? { paint: paintOf(finish) } : {}),
}));

// The kit a vehicle's load-outs stow, as sites of their own `in` the locker's: each item seated in its slot
// (tools/stowage.mjs), a far twin's slot turned rather than reflected, since an item is never mirrored.
const stowedSites = (sites) => {
  const stowing = sites.filter(({ stowed }) => stowed !== undefined);
  const stowage = readStowage(built, manifest.models, stowing.flatMap(({ part, stowed }) => [part, ...Object.values(stowed)]));
  return stowing.flatMap(({ id, part, at, mirror, stowed }) => Object.entries(stowed).map(([slotId, item]) => {
    const { frame } = stowage.get(part).slots.find((slot) => slot.id === slotId);
    const { rotation, at: offset } = stowedPose(mirror ? farSlot(frame, MIRRORED_AXIS) : frame, stowage.get(item).seats[0].frame);
    return { site: `${id}/${slotId}`, in: id, model: item, at: at.map((x, a) => x + offset[a]), turn: mat3ToQuat(rotation) };
  }));
};

// A vehicle weighs its sites' models together and fills the volume of their voxels. A figure comes only when every
// site's model has it, rather than a total short of what the vehicle holds.
const vehiclePhysical = (sites) => {
  const parts = sites.map(({ model }) => modelsById.get(model));
  const total = (key) => (parts.some((part) => part[key] === undefined) ? {} : { [key]: parts.reduce((sum, part) => sum + part[key], 0) });
  return { ...total('massKg'), ...total('volumeM3') };
};

// Each vehicle the manifest places (tools/placements.mjs), with its tags and the model at each site, its stowed kit
// among them; a vehicle has no keywords of its own.
const vehicles = manifest.vehicles.map(({ id, title, pack, path, tags }) => {
  if (modelsById.has(id)) throw new Error(`vehicle ${id} shares its id with a model`);
  const { sites } = JSON.parse(readFileSync(join(built, pack, path), 'utf8'));
  const missing = missingParts(sites);
  if (missing.length > 0) throw new Error(`vehicle ${id} places models the tree does not hold: ${missing.join(' ')}`);
  const placed = [...placedSites(sites), ...stowedSites(sites)];
  return { id, title, placements: `${pack}/${path}`, tags: tags ?? {}, keywords: [], sites: placed, form: formOf({ sites: placed }), ...vehiclePhysical(placed), ...(history ? { history: vehicleStanding(stands[id], placed.map(({ model }) => stands[model])) } : {}) };
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
  // The press check and each strike play on the page as clips through their key frames' pose files, each at its own
  // time; a generator writes those files, so one missing means it has not been run since its key frames changed.
  const generated = [
    { sequences: { 'press check': pressCheckClip(readPressCheck(root)) }, tool: 'tools/press-check.mjs' },
    { sequences: wieldSequences(readWields(root)), tool: 'tools/wields.mjs' },
  ];
  for (const { sequences, tool } of generated) {
    const unwritten = [...new Set(Object.values(sequences).flatMap(({ keys }) => keys.map(({ fixture }) => fixture)))].filter((name) => !poses.includes(name));
    if (unwritten.length > 0) throw new Error(`sequence frames with no pose file (node ${tool}): ${unwritten.join(', ')}`);
  }
  const sequences = Object.assign({}, ...generated.map(({ sequences }) => sequences));
  writeFileSync(join(out, 'rig.json'), JSON.stringify({ ...rig, clips: { file: actor.clips, walkSpeed: actor.walkSpeed }, doll: doll.sites, poses, sequences }));
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
writeFileSync(join(out, 'models.json'), JSON.stringify({ taxonomy: { categories, facets }, models: shown, vehicles, assemblies, ...(history ? { release: { version: history.version, url: `${REPOSITORY}/releases/tag/` } } : {}) }));
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
if (values.analytics) addAnalytics(out, versionHtml(readVersion(root)));
writeFileSync(join(out, '.nojekyll'), '');
console.log(`${models.length} models, ${vehicles.length} vehicles and ${assemblies.length} assemblies into ${out}`);
