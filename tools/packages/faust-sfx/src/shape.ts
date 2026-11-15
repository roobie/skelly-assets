export type ShapeSettings = { peakDbfs: number; silenceDb: number; fadeMs: number };
export type Levels = { finite: boolean; peakDbfs: number; rmsDbfs: number };

const toDb = (gain: number) => 20 * Math.log10(gain);
const fromDb = (db: number) => 10 ** (db / 20);

/**
 * Brings a sound to one peak level, so a batch can be auditioned without riding the volume, and cuts the tail
 * once it falls below silence relative to that peak. The short fade hides the cut.
 */
export function shapeSound(samples: Float32Array, sampleRate: number, settings: ShapeSettings): Float32Array {
  const peak = peakOf(samples);
  if (!(peak > 0) || !Number.isFinite(peak)) return samples;
  const floor = peak * fromDb(settings.silenceDb);
  let end = samples.length;
  while (end > 0 && Math.abs(samples[end - 1] ?? 0) < floor) end -= 1;
  const gain = fromDb(settings.peakDbfs) / peak;
  const fade = Math.min(end, Math.round((settings.fadeMs / 1000) * sampleRate));
  return samples.slice(0, end).map((sample, index) => sample * gain * Math.min(1, (end - index) / fade));
}

export const peakOf = (samples: Float32Array) => samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);

export function levelsOf(samples: Float32Array): Levels {
  const power = samples.reduce((sum, sample) => sum + sample * sample, 0) / Math.max(samples.length, 1);
  return { finite: samples.every(Number.isFinite), peakDbfs: toDb(peakOf(samples)), rmsDbfs: toDb(Math.sqrt(power)) };
}
