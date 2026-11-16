import { seededRng } from '../../construct/src/foundation/random.ts';
import type { Slider } from './faust.ts';

/**
 * A slider setting drawn from the slider's own range, the same for the same seed on any machine. A log slider
 * is drawn evenly in octaves, so a pitch range does not spend nearly all its draws in the top octave. Noise seeds
 * are drawn after the shaping sliders, so a family that gains a noise seed keeps the settings its seeds drew before.
 */
export function drawValues(sliders: readonly Slider[], seed: number): Record<string, number> {
  const rng = seededRng(seed);
  const ordered = [...sliders.filter((slider) => !slider.noise), ...sliders.filter((slider) => slider.noise)];
  return Object.fromEntries(ordered.map((slider) => [slider.address, onStep(slider, spanAt(slider, rng()))]));
}

const spanAt = ({ min, max, log }: Slider, at: number) =>
  log && min > 0 ? min * (max / min) ** at : min + (max - min) * at;

function onStep({ min, max, step }: Slider, value: number) {
  if (!(step > 0)) return value;
  // Rounding the step count, not the value, keeps a float step from drifting the value off its grid.
  const stepped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, Number(stepped.toPrecision(12))));
}

/** Sounds spread over the patches in turn, so any count samples every family before it repeats one. */
export const planBatch = (patches: readonly string[], firstSeed: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({ patch: patches[index % patches.length] ?? '', seed: firstSeed + index }));
