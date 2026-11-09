// Builds the showcase site into _site/: the page, the models of a built tree and a models.json that lists them with
// their category and tags, and the vocabulary's meanings for the page's labels (models/taxonomy.json).
// Usage: node site/build.mjs [--built dir] [outDir]; the tree defaults to built/. No dependencies; the page loads
// three.js from a CDN. The models are the GLB models the tree's manifest.json names (tools/manifest.mjs), at their
// pack paths.
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { applyJointDelta, applyMotion, applyOverlay, decodeFrame, sampleClip } from '../tools/actorCompose.mjs';
import { readMobRows } from '../tools/layout.mjs';
import { VOCABULARY } from '../tools/taxonomy.mjs';
import { mat3ToQuat } from '../tools/packages/mobgen/src/core/math.ts';


const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { values, positionals } = parseArgs({ allowPositionals: true, options: { built: { type: 'string', default: join(root, 'built') } } });
const out = resolve(root, positionals[0] ?? '_site');
const built = resolve(values.built);

const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
// A walk clip states its stride in metres; the viewer paces it by the authored walk speed of the row that baked it.
const walkSpeeds = new Map(readMobRows(root).map((row) => [`${row.pack}/${row.clips}`, row.walk_speed]));
const walkSpeedOf = (clips) => {
  const speed = walkSpeeds.get(clips);
  if (!(speed > 0)) throw new Error(`${clips}: no models/mobs.json row with a positive walk_speed`);
  return speed;
};
const models = manifest.models
  .filter(({ path }) => path.endsWith('.glb'))
  .map(({ id, pack, path, category, tags, clips, body }) => ({
    id,
    category: category ?? null,
    tags: tags ?? {},
    file: `${pack}/${path}`,
    clips: clips === undefined ? null : `${pack}/${clips}`,
    body: body === undefined ? null : `${pack}/${body}`,
  }))
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
  .map(({ id, file, category, tags, clips, body }) => ({
    id,
    file,
    bytes: statSync(join(built, file)).size,
    category,
    tags,
    clips,
    body,
    ...(clips ? { walkSpeed: walkSpeedOf(clips) } : {}),
  }));

// The browser cannot import actorCompose: it reaches mobgen TypeScript and Jsonnet source installation, while this
// dependency-free site has no bundler. Compose here in Node so the viewer only needs plain pose-frame playback.
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
for (const f of ['index.html', 'app.js', 'poseSample.mjs', 'style.css']) cpSync(join(here, f), join(out, f));
cpSync(built, join(out, 'built'), { recursive: true, filter: (src) => !src.endsWith('.import') });
for (const model of models) if (model.clips && model.body) {
  const clips = JSON.parse(readFileSync(join(built, model.clips), 'utf8'));
  const body = JSON.parse(readFileSync(join(built, model.body), 'utf8'));
  writeFileSync(join(out, 'built', model.clips), JSON.stringify(plainClips(clips, body)));
}
const { categories, facets } = JSON.parse(readFileSync(join(root, VOCABULARY), 'utf8'));
writeFileSync(join(out, 'models.json'), JSON.stringify({ taxonomy: { categories, facets }, models }));
writeFileSync(join(out, '.nojekyll'), '');
console.log(`${models.length} models into ${out}`);
