// Rows for tools/packages/impact-synth: one dropped object on one surface, each a full settings set for
// `renderImpact`. The shared parts are written once so a row differs only where its sound does.
local motion = {
  gravity: 9.81,
  maxSeconds: 4,
  startSeconds: 0.02,
  // Leaves room for the longest roll and the rocks inside maxSeconds.
  bounceBudgetSeconds: 2.4,
  rollSpeed: 0.25,
  hardSpeed: 5,
  amplitudeExponent: 1.2,
  referenceTumble: 0.2,
  // How each kind of event treats the metal: decay scale, ring level, and how far it chokes earlier ring.
  eventRing: {
    bounce: { decay: 1, level: 1, choke: 0.35 },
    roll: { decay: 0.12, level: 0.35, choke: 0.7 },
    rock: { decay: 0.2, level: 0.4, choke: 0.6 },
  },
  roll: {
    level: 0.025,
    startRate: 30,
    endRate: 8,
    minSeconds: 0.5,
    maxSeconds: 1.2,
    settleSeconds: 0.04,
    hardness: 0.25,
    endLevel: 0.3,
    wobbleDepth: 0.45,
    minWobbleHz: 2.5,
    maxWobbleHz: 4.5,
  },
  rocks: [
    { gap: 0.08, level: 0.018 },
    { gap: 0.13, level: 0.01 },
  ],
};

local mix = {
  contactLevel: 0.9,
  ringLevel: 0.2,
  upperModeTiltDb: 36,
  // Fixed so that quieter settings stay quieter; only peakCeiling ever turns a render down.
  outputGain: 0.6,
  peakCeiling: 0.9,
  chokeFadeSeconds: 0.0015,
  endFadeSeconds: 0.015,
};

local drop = { height: 1.2, restitution: 0.65, tumble: 0.2 };

local concrete = {
  decayScale: 1,
  contactGain: 1,
  hardness: 1,
  tick: { shortMs: 3, longMs: 5, highPassHz: 3200, gain: 0.55 },
};

// Hz, time to -60 dB in ms, and level of each mode of the object's ring.
local modes(hzs, mss, gains) = [
  { hz: hzs[i], ms: mss[i], gain: gains[i] }
  for i in std.range(0, std.length(hzs) - 1)
];
local hz = [3100, 5400, 7900, 10600, 13200];
local gains = [1, 0.8, 0.6, 0.42, 0.28];

{
  // A 9 mm brass case on concrete.
  'brass-on-concrete': {
    object: {
      contactGain: 1,
      ringGain: 1.2,
      hardness: 1,
      // A thin tube is never quite round, so each bending mode is a close pair that beats.
      split: { ratio: 0.008, lean: 0.25 },
      // A tumbling case turns its radiation pattern, which modulates the ring at the spin rate.
      spin: { minHz: 15, maxHz: 45, depth: 0.3 },
      // A case landing off-axis strikes with one end, then the other.
      doubleStrike: { chancePerTumble: 1.5, minMs: 1.5, maxMs: 8, fullTumble: 0.6, level: 0.5 },
      head: { lowHz: 1100, highHz: 1900, overtone: 0, ms: 35, gain: 0.9 },
      modes: modes(hz, [440, 400, 360, 300, 250], gains),
    },
    surface: concrete + { body: { lowHz: 600, highHz: 1900, overtone: 0, ms: 12, gain: 0.5 } },
    drop: drop,
    motion: motion,
    mix: mix,
  },

  // A vial of hard glass on concrete: decay falls roughly as 1/f, every mode is one pure sine, and nearly all
  // energy sits above 2.5 kHz.
  'glass-on-concrete': {
    object: {
      contactGain: 1,
      ringGain: 1,
      hardness: 1,
      split: null,
      spin: null,
      doubleStrike: null,
      head: null,
      modes: modes(hz, [250, 180, 120, 80, 50], gains),
    },
    surface: concrete + { body: null },
    drop: drop,
    motion: motion,
    mix: mix,
  },
}
