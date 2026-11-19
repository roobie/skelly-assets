// The security walker's damage clips: the limp it walks once a leg is lost from the heel down, and the flinch a
// heavy round knocks into it. They are keyed the way its other clips are (`tools/packages/mobgen/src/mob/walker/
// motion.ts`, WalkerClipDef): the hull, head and pods as joint angles, the legs as where the feet go, which the
// solver turns into hinge angles. This file holds only the values a retune or a mod would change.
local roster = import 'models/guns/roster.libsonnet';

local rest = [0, 0, 0];
// The same track on both pods, mirrored as the rig's joint frames are built to: flex is shared, twist and abduct
// change sign.
local both(name, track) = {
  [name + '.L']: { track: track },
  [name + '.R']: { track: [[key[0], [key[1][0], -key[1][1], -key[1][2]]] for key in track] },
};

// A heavy hit is one from a round a heavy machine gun or an anti-materiel rifle fires, or anything heavier, named by
// the cartridge's source in `models/guns/roster.libsonnet`. Lighter rounds only chip the plate: a boss that flinched
// at every hit would never get a shot off.
local heavyCartridges = ['50-bmg', '40x365r', '120x570'];
local heavyRounds = ['round_' + row.name for row in roster.cartridges if std.member(heavyCartridges, row.source)];
assert std.length(heavyRounds) == std.length(heavyCartridges) : 'a heavy cartridge has no roster row: %s' % [heavyCartridges];

// The flinch rocks the hull back from the hit. BR set the band; the hull's own joint range (plan.ts, JOINT_LIMITS)
// is the harder cap, and the motion test holds every clip inside it.
local tiltBounds = { min: 10, max: 15 };
local tiltDeg = 11;
assert tiltDeg >= tiltBounds.min && tiltDeg <= tiltBounds.max : 'the flinch tilt must stay inside its band';
local flinchPeak = 0.2;

{
  heavyRounds: heavyRounds,
  tiltBounds: tiltBounds,
  clips: {
    // One leg lost from the heel down, keyed for the left; the right plays it mirrored. The stump cannot roll
    // over a foot, so it is set down briefly and lifted again: the sound leg carries a long stance and swings
    // through fast, while the stump swings slow and low and lands where the heel stood. The hull drops hard
    // and nods as it falls onto the short leg, then rides up on the sound one, so the body all but stalls
    // over the stump and surges over the good foot.
    limp: {
      seconds: 2.8,
      loop: true,
      travel: [[0, 0], [0.62, 1.0], [1, 1.3]],
      stride: { duty: 0.74, lift: 0.4, tuck: 26, droop: 20 },
      // The stump's phase starts as the sound foot lands, so it lands at 1 - shift into the cycle.
      stump: { stride: { duty: 0.36, lift: 0.2, tuck: 30, droop: 0 }, shift: 0.36 },
      drop: [[0, 0.06], [0.1, 0.1], [0.4, 0.02], [0.64, 0.05], [0.72, 0.2], [0.9, 0.12], [1, 0.06]],
      channels: {
        hull: { track: [[0, [-1, 0, 0]], [0.1, [-2, 0, 0]], [0.4, [1, 0, 0]], [0.64, [0, 0, 0]], [0.73, [-6, 0, 0]], [0.9, [-3, 0, 0]], [1, [-1, 0, 0]]] },
        head: { track: [[0, [1, 0, 0]], [0.14, [2, 0, 0]], [0.44, [-1, 0, 0]], [0.66, [0, 0, 0]], [0.77, [5, 0, 0]], [0.93, [2, 0, 0]], [1, [1, 0, 0]]] },
      } + both('pod', [[0, rest], [0.16, [-3, 0, 0]], [0.45, [1, 0, 0]], [0.68, [0, 0, 0]], [0.78, [-8, 0, 0]], [0.94, [-2, 0, 0]], [1, rest]]),
    },
    // A heavy round's hit: the hull snaps back by the tilt and the legs sink to take it, the head and pods lag the
    // snap, and the walker settles back onto guard. Its feet stay where they stand.
    flinch: {
      seconds: 0.5,
      loop: false,
      peak: flinchPeak,
      drop: [[0, 0], [flinchPeak, 0.08], [1, 0]],
      channels: {
        hull: { track: [[0, rest], [flinchPeak, [tiltDeg, 0, 0]], [1, rest]] },
        head: { track: [[0, rest], [flinchPeak + 0.06, [-4, 0, 0]], [1, rest]] },
      } + both('pod', [[0, rest], [flinchPeak + 0.08, [-6, 0, 0]], [1, rest]]),
    },
  },
}
