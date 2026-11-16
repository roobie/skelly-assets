import { fileURLToPath } from 'node:url';
import {
  FaustCompiler,
  type FaustMonoDspGenerator as Generator,
  FaustMonoDspGenerator,
  type FaustUIInputItem,
  instantiateFaustModuleFromFile,
  LibFaust,
} from '@grame/faustwasm/dist/esm/index.js';

/**
 * One slider a patch exposes, with the range it declares; the range is the patch's, never the tool's. A `noise`
 * slider seeds the patch's noise rather than shaping the sound.
 */
export type Slider = { address: string; label: string; min: number; max: number; step: number; log: boolean; noise: boolean };

export type Patch = { name: string; seconds: number; sliders: Slider[]; generator: Generator };

// The library folder inside the compiler's own file system, where patches find the shared `sfx.lib`.
const LIBRARY_DIR = '/patches';
// Flush denormals: a decaying resonator otherwise slows to a crawl in its silent tail.
const COMPILE_ARGS = `-I ${LIBRARY_DIR} -ftz 2`;
const BUFFER_FRAMES = 128;

/** Loads libfaust once; compiling is per patch. `libraries` are written where every patch can import them. */
export async function loadCompiler(libraries: Record<string, string>): Promise<FaustCompiler> {
  const jsFile = fileURLToPath(import.meta.resolve('@grame/faustwasm/libfaust-wasm/libfaust-wasm.js'));
  const libFaust = new LibFaust(await instantiateFaustModuleFromFile(jsFile));
  const fs = libFaust.fs();
  fs.mkdirTree(LIBRARY_DIR);
  for (const [file, source] of Object.entries(libraries)) fs.writeFile(`${LIBRARY_DIR}/${file}`, source);
  return new FaustCompiler(libFaust);
}

export async function compilePatch(compiler: FaustCompiler, name: string, source: string): Promise<Patch> {
  const generator = new FaustMonoDspGenerator();
  const compiled = await generator.compile(compiler, name, source, COMPILE_ARGS);
  if (!compiled) throw new Error(`${name}: ${compiler.getErrorMessage()}`);
  const probe = await offline(generator, 48_000, name);
  const seconds = Number(probe.getMeta().meta.find((entry) => 'duration' in entry)?.duration);
  if (!(seconds > 0)) throw new Error(`${name}: declare a positive duration in seconds`);
  return { name, seconds, sliders: probe.getDescriptors().filter(isSlider).map(toSlider), generator };
}

/** A fresh instance per render, so no state from an earlier sound leaks into this one. */
export async function renderPatch(patch: Patch, values: Record<string, number>, sampleRate: number): Promise<Float32Array> {
  const processor = await offline(patch.generator, sampleRate, patch.name);
  for (const [address, value] of Object.entries(values)) processor.setParamValue(address, value);
  const [mono] = processor.render(undefined, Math.ceil(patch.seconds * sampleRate));
  if (!mono) throw new Error(`${patch.name}: the patch has no output`);
  return mono;
}

async function offline(generator: Generator, sampleRate: number, name: string) {
  const processor = await generator.createOfflineProcessor(sampleRate, BUFFER_FRAMES);
  if (!processor) throw new Error(`${name}: no offline processor`);
  return processor;
}

const isSlider = (item: FaustUIInputItem) => item.type === 'hslider' || item.type === 'vslider' || item.type === 'nentry';

const toSlider = (item: FaustUIInputItem): Slider => ({
  address: item.address,
  label: item.label,
  min: item.min ?? 0,
  max: item.max ?? 0,
  step: item.step ?? 0,
  log: item.meta?.some((entry) => entry.scale === 'log') ?? false,
  noise: item.meta?.some((entry) => 'noise' in entry) ?? false,
});
