// The parts impact rows share, for tools/packages/impact-synth: the objects that fall, the surfaces they land on and
// the motion, strike and mix every drop uses. A pack file pairs objects with surfaces through `rows`, so a row
// differs from another only where its sound does.
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
  // The most a tumble can widen the scatter of landings, as a multiple of the reference tumble's.
  maxTumbleSpread: 1.5,
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
    // How far the wobble slows by the end of the roll, and how far tumble jitters the gaps between ticks.
    wobbleSlowing: 0.4,
    tickJitter: 0.5,
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

// How a single strike is shaped, whatever the object and surface: the contact burst, the ring's attack and tilt,
// the pitch of a body thud, and how landings scatter the modes.
local strike = {
  contact: { softSeconds: 0.003, hardSeconds: 0.0008, softHz: 1800, hardHz: 14000 },
  ring: {
    softAttackSeconds: 0.0015,
    hardAttackSeconds: 0.0004,
    // Softer hits tilt the upper modes down by upperModeTiltDb times one minus hardness to this power.
    tiltExponent: 0.6,
  },
  // A body thud's pitch is its hardness share of the range plus a random share.
  body: { attackSeconds: 0.001, overtoneLevel: 0.4, hardnessShare: 0.7, randomShare: 0.3 },
  landing: { scatter: 0.5, poseWeight: 1.4 },
  // A split pair's spacing varies from the least to the most of its ratio between hits.
  splitSpacing: { least: 0.25, spread: 1.5 },
};

local drop = { height: 1.2, restitution: 0.65, tumble: 0.2 };

// Hz, time to -60 dB in ms, and level of each mode of the object's ring.
local modes(hzs, mss, gains) = [
  { hz: hzs[i], ms: mss[i], gain: gains[i] }
  for i in std.range(0, std.length(hzs) - 1)
];
local hz = [3100, 5400, 7900, 10600, 13200];
local gains = [1, 0.8, 0.6, 0.42, 0.28];

{
  objects: {
    // A 9 mm brass case.
    brass_case_9mm: {
      id: 'brass_case_9mm',
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

    // A small vial of hard glass. It reads as glass because its ring is high, short and pure: each mode a single sine
    // with no beating pair or spin, decays falling roughly as one over pitch, and nearly all energy above 2.5 kHz.
    glass_vial: {
      id: 'glass_vial',
      contactGain: 1,
      ringGain: 1,
      hardness: 1,
      split: null,
      spin: null,
      doubleStrike: null,
      head: null,
      modes: modes(hz, [250, 180, 120, 80, 50], gains),
    },
  },

  // What a surface is, and how it changes the drop: `drop` and `motion` patch the shared ones, since a soft ground
  // takes a bounce and a roll that a hard one gives back.
  surfaces: {
    // The slab under a metal case also thuds.
    concrete: {
      surface: {
        id: 'concrete',
        decayScale: 1,
        contactGain: 1,
        hardness: 1,
        tick: { shortMs: 3, longMs: 5, highPassHz: 3200, gain: 0.55 },
        body: { lowHz: 600, highHz: 1900, overtone: 0, ms: 12, gain: 0.5 },
      },
    },

    // A steel plate is as hard as the slab, rings back and gives more of the bounce back.
    metal: {
      surface: {
        id: 'metal',
        decayScale: 1.15,
        contactGain: 1.1,
        hardness: 1,
        tick: { shortMs: 2, longMs: 4, highPassHz: 4500, gain: 0.6 },
        // The plate's own ring, with an inharmonic overtone. A plate rings at its own modes whatever strikes it, so its
        // pitch hardly moves: a ring that drops in pitch as the hits soften, and wanders from tick to tick of a roll,
        // is how bubbles sound, and makes the case seem to hold a liquid.
        body: { lowHz: 2350, highHz: 2450, overtone: 2.76, ms: 45, gain: 0.35 },
      },
      drop: { restitution: 0.7 },
    },

    // A board yields a little, damps the case's ring and knocks hollow and low.
    wood: {
      surface: {
        id: 'wood',
        decayScale: 0.75,
        contactGain: 0.9,
        hardness: 0.7,
        tick: { shortMs: 4, longMs: 7, highPassHz: 1800, gain: 0.25 },
        body: { lowHz: 220, highHz: 480, overtone: 2.4, ms: 40, gain: 0.9 },
      },
      drop: { restitution: 0.5 },
    },

    // Packed earth swallows most of the ring and the bounce, and a case barely rolls on it.
    dirt: {
      surface: {
        id: 'dirt',
        decayScale: 0.3,
        contactGain: 0.6,
        hardness: 0.3,
        tick: { shortMs: 6, longMs: 12, highPassHz: 700, gain: 0.2 },
        body: { lowHz: 90, highHz: 180, overtone: 0, ms: 20, gain: 0.7 },
      },
      drop: { restitution: 0.25 },
      motion: {
        roll+: { level: 0.008, minSeconds: 0.1, maxSeconds: 0.3 },
        rocks: [{ gap: 0.06, level: 0.006 }],
      },
    },
  },

  // The takes a build bakes of every row, which a game picks among.
  seeds: [1, 2, 3, 4],

  // One row per [object, surface] pair, keyed `<object>_on_<surface>`.
  rows(pairs):: {
    [pair[0].id + '_on_' + pair[1].surface.id]: {
      seeds: $.seeds,
      object: pair[0],
      surface: pair[1].surface,
      strike: strike,
      drop: drop + std.get(pair[1], 'drop', {}),
      motion: motion + std.get(pair[1], 'motion', {}),
      mix: mix,
    }
    for pair in pairs
  },
}
