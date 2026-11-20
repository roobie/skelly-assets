// The doll's locomotion, as tools/locomotion.mjs bakes it into the clips a game plays: how it stands and idles, its
// walks and the poses it lies or crouches in. Seeded from ahg3's figure gait (a port of arpg1's avatar gait), whose look
// the owner judged there. Angles are degrees in the rig's terms (models/dolls/player/rig.libsonnet): [flex, twist, abduct],
// flex positive the way the joint works most, written for each bone as the rig names it.
//
// `bones` names the bones each part of the gait turns: the legs, knees, feet, arms and elbows, left then right, and
// `lean`, the bones the body leans forward by, each taking what it can within its limits before the next: leaning from
// the hips first lets a walk's back swing keep within the hip's extension while its feet land where they would.
//
// `stand`: the elbows' bend standing still, and the idle's sway over it, oscillators as mobgen writes an idle's motion
// (tools/actorCompose.mjs, `applyMotion`), about the model frame's axes.
//
// `walks`: by name, a walk loop of `frames` poses. `swingDeg`: how far each thigh swings either side of upright;
// `bendDeg`: the knees' bend all through it (a crouch); `kneeDeg`: how much further a knee bends at mid-swing;
// `armShare`: the arms' swing as a share of the thighs'; `elbowDeg` the elbows' bend, and `elbowFollow` the share of
// an arm's forward swing it bends further by; `leanDeg`: the body's lean forward. `speedMetresPerSecond` is the pace the
// walk is drawn for, which a game may use to choose between walks and the posing page plays it at; the stride, and so
// the pace of the feet, comes from the swing and the legs.
//
// `poses`: by name, a pose held still: angles by bone over the rest pose, stood on the ground.
local frames = 32;
{
  bones: {
    legs: ['thigh.L', 'thigh.R'],
    knees: ['shin.L', 'shin.R'],
    feet: ['foot.L', 'foot.R'],
    arms: ['upperArm.L', 'upperArm.R'],
    elbows: ['forearm.L', 'forearm.R'],
    lean: ['pelvis', 'spine'],
  },
  stand: {
    elbowDeg: 10,
    motion: [
      { periodSimSeconds: 4, amplitudeDeg: 1, salt: 1, bones: [{ bone: 'spine', axis: 'x', scale: -1 }] },
      {
        periodSimSeconds: 6,
        amplitudeDeg: 1,
        salt: 2,
        bones: [{ bone: 'spine', axis: 'z', scale: 0.6 }, { bone: 'neck', axis: 'z', scale: 0.4 }],
      },
      { periodSimSeconds: 7, amplitudeDeg: 5, salt: 3, bones: [{ bone: 'head', axis: 'y', scale: 1 }] },
    ],
  },
  walks: {
    // Low and wary: knees soft all through, a forward lean, the arms held in close.
    sneak: { frames: frames, speedMetresPerSecond: 1.0, swingDeg: 15, bendDeg: 15, kneeDeg: 45, armShare: 0.4, elbowDeg: 35, elbowFollow: 0.5, leanDeg: 10 },
    walk: { frames: frames, speedMetresPerSecond: 1.5, swingDeg: 20, bendDeg: 0, kneeDeg: 40, armShare: 0.8, elbowDeg: 10, elbowFollow: 0.7, leanDeg: 2 },
    run: { frames: frames, speedMetresPerSecond: 4.0, swingDeg: 32, bendDeg: 0, kneeDeg: 80, armShare: 0.9, elbowDeg: 75, elbowFollow: 0.3, leanDeg: 12 },
    crouch_walk: { frames: frames, speedMetresPerSecond: 0.9, swingDeg: 16, bendDeg: 50, kneeDeg: 30, armShare: 0.4, elbowDeg: 40, elbowFollow: 0.5, leanDeg: 25 },
  },
  poses: {
    // Down on the right knee, the left foot planted ahead, the hands drawn up in front.
    crouch: {
      spine: [15, 0, 0],
      'upperArm.L': [30, 0, 0],
      'forearm.L': [70, 0, 0],
      'upperArm.R': [20, 0, 0],
      'forearm.R': [80, 0, 0],
      'thigh.L': [80, 0, 0],
      'shin.L': [80, 0, 0],
      'thigh.R': [-5, 0, 0],
      'shin.R': [85, 0, 0],
    },
    // Flat on the front, the arms reaching ahead and the head raised to look forward.
    prone: {
      pelvis: [90, 0, 0],
      neck: [-30, 0, 0],
      head: [-25, 0, 0],
      'upperArm.L': [150, 0, -15],
      'upperArm.R': [150, 0, 15],
      'forearm.L': [30, 0, 0],
      'forearm.R': [30, 0, 0],
      'thigh.L': [0, 0, 8],
      'thigh.R': [0, 0, -8],
    },
    // Down on the back, propped on one side, one knee drawn up and the head turned.
    downed: {
      pelvis: [-80, 0, 0],
      neck: [25, 0, 0],
      head: [10, 25, 0],
      'upperArm.L': [0, 0, 25],
      'upperArm.R': [40, 0, -10],
      'forearm.R': [90, 0, 0],
      'thigh.L': [45, 0, 0],
      'shin.L': [85, 0, 0],
    },
    // Flat on the back, limbs flung apart and the head lolled to one side.
    dead: {
      pelvis: [-90, 0, 0],
      neck: [0, 25, 0],
      head: [0, 45, 0],
      'upperArm.L': [0, 0, 65],
      'upperArm.R': [0, 0, -80],
      'thigh.L': [0, 0, 12],
      'thigh.R': [0, 0, -18],
    },
  },
}
