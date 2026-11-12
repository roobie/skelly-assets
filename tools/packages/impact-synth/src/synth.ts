import { parse } from 'valibot';
import { type ImpactRow, SampleRate } from './schema.ts';

type Rng = () => number;
type Body = NonNullable<ImpactRow['surface']['body']>;
type Tick = NonNullable<ImpactRow['surface']['tick']>;
type Split = NonNullable<ImpactRow['object']['split']>;
type Spin = NonNullable<ImpactRow['object']['spin']>;
type DoubleStrike = NonNullable<ImpactRow['object']['doubleStrike']>;
type EventKind = keyof ImpactRow['motion']['eventRing'];

interface Hit {
  kind: EventKind;
  t: number;
  hardness: number;
  level: number;
  weights: number[];
}
interface Variation {
  spin: { hz: number; phase: number; depth: number } | null;
  echo: { seconds: number; level: number } | null;
}

// "Time to silence" means -60 dB, in every row.
const LN_SILENCE = Math.log(1000);
// A separate stream per hit, so spin and double strike never shift the draws that shape the sound.
const TUMBLE_STREAM = 1000;

const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const symmetric = (rng: Rng) => rng() * 2 - 1;
// A four-draw sum has a spread of 1/sqrt(3), so this scales it to about one. It stays 1.73, not the exact root,
// because that is what BR approved by ear.
const gaussian = (rng: Rng) => (rng() + rng() + rng() + rng() - 2) * 1.73;
const derivedSeed = (seed: number, index: number) => (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
const lowPassCoefficient = (hz: number, sampleRate: number) => 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);

/** The settings and rate one render shares between its steps. */
interface Context {
  row: ImpactRow;
  sampleRate: number;
}

const tumbleSpread = ({ row }: Context) => Math.min(row.motion.maxTumbleSpread, row.drop.tumble / row.motion.referenceTumble);

// Rim landings favour upper modes and body landings lower ones, plus scatter per mode.
function landingWeights({ row }: Context, pose: number, spread: number, rng: Rng) {
  const { scatter, poseWeight } = row.strike.landing;
  const count = row.object.modes.length;
  return Array.from({ length: count }, (_, i) => {
    const position = count > 1 ? i / (count - 1) - 0.5 : 0;
    return Math.exp(spread * (scatter * gaussian(rng) + poseWeight * pose * position));
  });
}

// Keeps the whole bounce sequence inside its time budget by limiting e.
function usableRestitution({ motion, drop }: ImpactRow, impactSpeed: number) {
  const reach = (motion.bounceBudgetSeconds * motion.gravity) / 2;
  return Math.min(drop.restitution, (reach + motion.rollSpeed) / (impactSpeed + reach));
}

function planBounces(context: Context, restitution: number, rng: Rng): Hit[] {
  const { motion, drop } = context.row;
  const { tumble } = drop;
  const spread = tumbleSpread(context);
  const hits: Hit[] = [];
  let speed = Math.sqrt(2 * motion.gravity * drop.height);
  let t = motion.startSeconds;
  for (;;) {
    const hitSpeed = speed * (1 + tumble * symmetric(rng));
    hits.push({
      kind: 'bounce',
      t,
      hardness: clamp01(hitSpeed / motion.hardSpeed),
      level: (hitSpeed / motion.hardSpeed) ** motion.amplitudeExponent,
      weights: landingWeights(context, symmetric(rng), spread, rng),
    });
    const rebound = speed * restitution;
    if (rebound < motion.rollSpeed) break;
    const gap = ((2 * rebound) / motion.gravity) * (1 + tumble * symmetric(rng));
    if (t + gap > motion.startSeconds + motion.bounceBudgetSeconds) break;
    t += gap;
    speed = rebound;
  }
  return hits;
}

function planRoll(context: Context, startSeconds: number, rng: Rng): Hit[] {
  const { motion, drop } = context.row;
  const { roll } = motion;
  const spread = tumbleSpread(context);
  const duration = lerp(roll.minSeconds, roll.maxSeconds, rng());
  const wobbleHz = lerp(roll.minWobbleHz, roll.maxWobbleHz, rng());
  const wobblePhase = rng() * 2 * Math.PI;
  const hits: Hit[] = [];
  let elapsed = 0;
  while (elapsed < duration) {
    const progress = elapsed / duration;
    const wobble = Math.sin(2 * Math.PI * wobbleHz * elapsed * (1 - roll.wobbleSlowing * progress) + wobblePhase);
    hits.push({
      kind: 'roll',
      t: startSeconds + elapsed,
      hardness: roll.hardness,
      level: roll.level * lerp(1, roll.endLevel, progress) * (1 + roll.wobbleDepth * wobble),
      weights: landingWeights(context, wobble, spread, rng),
    });
    const rate = roll.startRate * (roll.endRate / roll.startRate) ** progress;
    elapsed += (1 / rate) * (1 + roll.tickJitter * drop.tumble * symmetric(rng));
  }
  let t = startSeconds + duration;
  for (const rock of motion.rocks) {
    t += rock.gap * (1 + drop.tumble * symmetric(rng));
    hits.push({
      kind: 'rock',
      t,
      hardness: roll.hardness,
      level: rock.level,
      weights: landingWeights(context, symmetric(rng), spread, rng),
    });
  }
  return hits;
}

// The plan uses no sample rate, so a row keeps its timing at every rate.
function planEvents(context: Context, seed: number): Hit[] {
  const { motion, drop } = context.row;
  const rng = mulberry32(seed);
  const impactSpeed = Math.sqrt(2 * motion.gravity * drop.height);
  const bounces = planBounces(context, usableRestitution(context.row, impactSpeed), rng);
  const lastBounce = bounces[bounces.length - 1];
  if (lastBounce === undefined) throw new Error('a drop always lands at least once');
  return [...bounces, ...planRoll(context, lastBounce.t + motion.roll.settleSeconds, rng)];
}

function addContact(layer: Float32Array, start: number, hit: Hit, gain: number, { row, sampleRate }: Context, rng: Rng) {
  const { contact } = row.strike;
  const length = Math.max(2, Math.round(lerp(contact.softSeconds, contact.hardSeconds, hit.hardness) * sampleRate));
  const a = lowPassCoefficient(lerp(contact.softHz, contact.hardHz, hit.hardness), sampleRate);
  let first = 0;
  let second = 0;
  for (let i = 0; i < length && start + i < layer.length; i++) {
    const noise = symmetric(rng) * Math.sin((Math.PI * i) / length);
    first += a * (noise - first);
    second += a * (first - second);
    layer[start + i] = layer[start + i]! + second * gain;
  }
}

function addTick(layer: Float32Array, start: number, hit: Hit, tick: Tick, gain: number, sampleRate: number, rng: Rng) {
  const length = Math.max(2, Math.round(lerp(tick.longMs, tick.shortMs, hit.hardness) * 0.001 * sampleRate));
  const a = lowPassCoefficient(tick.highPassHz, sampleRate);
  let first = 0;
  let second = 0;
  for (let i = 0; i < length && start + i < layer.length; i++) {
    const noise = symmetric(rng);
    first += a * (noise - first);
    const once = noise - first;
    second += a * (once - second);
    layer[start + i] = layer[start + i]! + (once - second) * (1 - i / length) ** 2 * gain;
  }
}

function addBody(layer: Float32Array, start: number, hit: Hit, body: Body, gain: number, { row, sampleRate }: Context, rng: Rng) {
  const shape = row.strike.body;
  const hz = lerp(body.lowHz, body.highHz, shape.hardnessShare * hit.hardness + shape.randomShare * rng());
  const seconds = body.ms * 0.001;
  const length = Math.round(seconds * sampleRate);
  const attack = shape.attackSeconds * sampleRate;
  for (let i = 0; i < length && start + i < layer.length; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / attack) * Math.exp((-LN_SILENCE * t) / seconds);
    const tone =
      Math.sin(2 * Math.PI * hz * t) + (body.overtone ? shape.overtoneLevel * Math.sin(2 * Math.PI * hz * body.overtone * t) : 0);
    layer[start + i] = layer[start + i]! + tone * envelope * gain;
  }
}

function chokeRing(layer: Float32Array, start: number, factor: number, { row, sampleRate }: Context) {
  const fade = Math.max(1, Math.round(row.mix.chokeFadeSeconds * sampleRate));
  for (let i = start; i < layer.length; i++) {
    layer[i] = layer[i]! * (lerp(1, factor, Math.min(1, (i - start) / fade)));
  }
}

// The pair's gains sum to 1, so splitting a mode keeps its level; scatter 0 gives every hit the same pair.
function ringPartials(hz: number, split: Split | null, spacing: { least: number; spread: number }, scatter: number, rng: Rng) {
  const phase = () => rng() * 2 * Math.PI * scatter;
  if (!split) return [{ hz, share: 1, phase: phase() }];
  const apart = split.ratio * lerp(1, spacing.least + spacing.spread * rng(), scatter);
  const lean = split.lean * lerp(1, symmetric(rng), scatter);
  return [
    { hz: hz * (1 - apart / 2), share: (1 + lean) / 2, phase: phase() },
    { hz: hz * (1 + apart / 2), share: (1 - lean) / 2, phase: phase() },
  ];
}

// Dips by the spin depth once per turn and never rises above 1.
function spinCurve(spin: Variation['spin'], length: number, sampleRate: number) {
  const curve = new Float32Array(length).fill(1);
  if (!spin) return curve;
  for (let i = 0; i < length; i++) {
    curve[i] = 1 - spin.depth * (0.5 - 0.5 * Math.cos((2 * Math.PI * spin.hz * i) / sampleRate + spin.phase));
  }
  return curve;
}

function tailSeconds(hit: Hit, { row }: Context) {
  const longest = Math.max(...row.object.modes.map((mode) => mode.ms));
  return longest * 0.001 * row.surface.decayScale * row.motion.eventRing[hit.kind].decay;
}

function addRing(layer: Float32Array, start: number, hit: Hit, spinning: Variation['spin'], gain: number, context: Context, rng: Rng) {
  const { row, sampleRate } = context;
  const { object, surface, motion, mix, strike } = row;
  const treatment = motion.eventRing[hit.kind];
  const lastMode = object.modes.length - 1;
  const attack = Math.max(1, lerp(strike.ring.softAttackSeconds, strike.ring.hardAttackSeconds, hit.hardness) * sampleRate);
  const scatter = hit.weights.some((w) => w !== 1) ? 1 : 0;
  const tilt = (1 - hit.hardness ** strike.ring.tiltExponent) * mix.upperModeTiltDb;
  const spin = spinCurve(spinning, Math.min(Math.round(tailSeconds(hit, context) * sampleRate), layer.length - start), sampleRate);
  object.modes.forEach((mode, index) => {
    // Drawn before the Nyquist skip so the random draws, and so the sound, do not shift with the sample rate.
    const partials = ringPartials(mode.hz, object.split, strike.splitSpacing, scatter, rng);
    if (mode.hz >= sampleRate / 2) return;
    const position = lastMode > 0 ? index / lastMode : 0;
    const amplitude = gain * treatment.level * mode.gain * hit.weights[index]! * 10 ** ((-tilt * position) / 20);
    const seconds = mode.ms * 0.001 * surface.decayScale * treatment.decay;
    const length = Math.round(seconds * sampleRate);
    const decay = LN_SILENCE / (seconds * sampleRate);
    const steps = partials.map((partial) => (2 * Math.PI * partial.hz) / sampleRate);
    let fade = amplitude;
    const fadePerSample = Math.exp(-decay);
    for (let i = 0; i < length && start + i < layer.length; i++, fade *= fadePerSample) {
      let tone = 0;
      for (const [p, partial] of partials.entries()) tone += partial.share * Math.sin(steps[p]! * i + partial.phase);
      layer[start + i] = layer[start + i]! + fade * Math.min(1, i / attack) * spin[i]! * tone;
    }
  });
  if (object.head) addBody(layer, start, hit, object.head, gain * treatment.level * object.head.gain, context, rng);
}

function fadeEnd(layer: Float32Array, length: number, { row, sampleRate }: Context) {
  const fade = Math.min(length, Math.round(row.mix.endFadeSeconds * sampleRate));
  for (let i = 0; i < fade; i++) layer[length - 1 - i] = layer[length - 1 - i]! * (i / fade);
}

function secondStrike(strike: DoubleStrike, tumble: number, rng: Rng) {
  const struck = rng() < strike.chancePerTumble * tumble;
  const seconds = lerp(strike.minMs, strike.maxMs, clamp01(tumble / strike.fullTumble) * rng()) * 0.001;
  return struck ? { seconds, level: strike.level } : null;
}

function spinOf(spin: Spin | null, spread: number, rng: Rng): Variation['spin'] {
  return spin && { hz: lerp(spin.minHz, spin.maxHz, rng()), phase: rng() * 2 * Math.PI, depth: spin.depth * spread };
}

// Only a bounce spins and strikes twice. Tumble 0 gives spin depth 0 and a second-strike chance of 0.
function tumbleVariation(hit: Hit, context: Context, rng: Rng): Variation {
  if (hit.kind !== 'bounce') return { spin: null, echo: null };
  const { object, drop } = context.row;
  return {
    spin: spinOf(object.spin, tumbleSpread(context), rng),
    echo: object.doubleStrike && secondStrike(object.doubleStrike, drop.tumble, rng),
  };
}

/** The largest absolute sample. */
export const peakOf = (samples: Float32Array) => samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);

/**
 * One drop of the row's object on its surface, as mono samples between -1 and 1. The result depends only on the
 * row, the seed and the sample rate, so a render is reproducible anywhere.
 */
export function renderImpact(row: ImpactRow, seed: number, sampleRate: number): Float32Array {
  parse(SampleRate, sampleRate);
  const context: Context = { row, sampleRate };
  const { object, surface, mix } = row;
  const hits = planEvents(context, seed);
  const endSeconds = Math.max(...hits.map((hit) => hit.t + tailSeconds(hit, context)));
  const length = Math.ceil(Math.min(row.motion.maxSeconds, endSeconds + mix.endFadeSeconds) * sampleRate);
  const contact = new Float32Array(length);
  const ring = new Float32Array(length);
  const ground = new Float32Array(length);

  hits.forEach((source, index) => {
    const { spin, echo } = tumbleVariation(source, context, mulberry32(derivedSeed(seed, TUMBLE_STREAM + index)));
    const hit = { ...source, hardness: source.hardness * object.hardness * surface.hardness };
    const start = Math.round(hit.t * sampleRate);
    if (start >= length) return;
    const rng = mulberry32(derivedSeed(seed, index));
    const strike = (at: number, level: number) => {
      const contactGain = hit.level * level * mix.contactLevel * object.contactGain * surface.contactGain;
      addContact(contact, at, hit, contactGain, context, rng);
      addRing(ring, at, hit, spin, hit.level * level * mix.ringLevel * object.ringGain, context, rng);
    };
    chokeRing(ring, start, row.motion.eventRing[hit.kind].choke, context);
    strike(start, 1);
    if (echo) strike(start + Math.round(echo.seconds * sampleRate), echo.level);
    if (surface.tick) addTick(ground, start, hit, surface.tick, hit.level * surface.tick.gain, sampleRate, rng);
    if (surface.body) addBody(ground, start, hit, surface.body, hit.level * surface.body.gain, context, rng);
  });

  for (const layer of [contact, ring, ground]) fadeEnd(layer, length, context);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) samples[i] = contact[i]! + ring[i]! + ground[i]!;
  const loudest = peakOf(samples);
  const gain = loudest > 0 ? Math.min(mix.outputGain, mix.peakCeiling / loudest) : mix.outputGain;
  for (let i = 0; i < length; i++) samples[i] = samples[i]! * gain;
  return samples;
}
