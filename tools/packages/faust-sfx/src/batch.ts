import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { encodeOgg } from '../../../ogg.mjs';
import { drawValues, planBatch } from './explore.ts';
import { compilePatch, loadCompiler, type Patch, renderPatch } from './faust.ts';
import { type Levels, levelsOf, type ShapeSettings, shapeSound } from './shape.ts';

export type ExploreSettings = ShapeSettings & { sampleRate: number; count: number; oggQuality: number };
export type Sound = { file: string; patch: string; seed: number; seconds: number; values: Record<string, number> };

const SETTINGS_FILE = 'explore.json';

/** Every `.dsp` in the folder is a patch, and every `.lib` a library they may import, so a new family is a file. */
export async function readPatches(folder: string): Promise<Map<string, Patch>> {
  const files = readdirSync(folder).sort();
  const read = (file: string) => readFileSync(join(folder, file), 'utf8');
  const compiler = await loadCompiler(Object.fromEntries(files.filter((f) => f.endsWith('.lib')).map((f) => [f, read(f)])));
  const patches = new Map<string, Patch>();
  for (const file of files.filter((f) => f.endsWith('.dsp'))) {
    const name = basename(file, '.dsp');
    patches.set(name, await compilePatch(compiler, name, read(file)));
  }
  return patches;
}

export const readSettings = (folder: string): ExploreSettings =>
  JSON.parse(readFileSync(join(folder, SETTINGS_FILE), 'utf8')) as ExploreSettings;

export async function renderSound(patch: Patch, seed: number, settings: ExploreSettings) {
  const values = drawValues(patch.sliders, seed);
  const raw = await renderPatch(patch, values, settings.sampleRate);
  return { values, rawLevels: levelsOf(raw), samples: shapeSound(raw, settings.sampleRate, settings) };
}

/** Renders the batch to `out` as Ogg Vorbis files, a manifest that can reproduce each one, and a level log. */
export async function exploreBatch(
  patches: Map<string, Patch>,
  settings: ExploreSettings,
  options: { out: string; firstSeed: number; count: number; only?: readonly string[] },
) {
  const names = options.only?.length ? [...options.only] : [...patches.keys()];
  const unknown = names.filter((name) => !patches.has(name));
  if (unknown.length) throw new Error(`no patch named ${unknown.join(', ')}`);
  mkdirSync(options.out, { recursive: true });
  const sounds: Sound[] = [];
  const log: (Levels & { file: string; rawPeakDbfs: number })[] = [];
  for (const { patch: name, seed } of planBatch(names, options.firstSeed, options.count)) {
    const patch = patches.get(name) as Patch;
    const { values, rawLevels, samples } = await renderSound(patch, seed, settings);
    const file = `${name}-${seed}.ogg`;
    writeFileSync(join(options.out, file), await encodeOgg(samples, { sampleRate: settings.sampleRate, quality: settings.oggQuality }));
    sounds.push({ file, patch: name, seed, seconds: samples.length / settings.sampleRate, values });
    log.push({ file, rawPeakDbfs: rawLevels.peakDbfs, ...levelsOf(samples) });
  }
  writeFileSync(join(options.out, 'manifest.json'), `${JSON.stringify({ sampleRate: settings.sampleRate, sounds }, null, 2)}\n`);
  writeFileSync(join(options.out, 'levels.json'), `${JSON.stringify(log, null, 2)}\n`);
  return { sounds, log };
}
