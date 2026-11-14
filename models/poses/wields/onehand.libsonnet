// One hand on a club or blade, the right, the left closed by the chest out of the way. The guard holds the weapon up
// and forward with the right foot leading, so it threatens on the line it strikes along. The forehand cuts across from
// the right, the backhand from the left; the overhead comes down from behind the head; the thrust drives the tip
// straight out from a hand drawn back by the hip.
local body = import 'body.libsonnet';
local legs = body { pelvis: [0, 12, 0], 'thigh.R': [18, 0, -4], 'thigh.L': [-8, 0, 6], 'shin.R': [12, 0, 0], 'shin.L': [14, 0, 0] };
local left = { at: [-0.04, -0.12, 0.2], pole: [0.4, -1, 0], twist: 0 };
local held(at, pitch, yaw, roll=0, pole=[-0.5, -1, 0]) = { at: at, aim: { pitch: pitch, yaw: yaw, roll: roll }, poles: { 'hand.R': pole } };
local guard = { body: legs { spine: [6, 12, 0] }, weapon: held([0.1, -0.18, 0.32], -50, 15), free: { 'hand.L': left } };
local swing = { shares: { windup: 18, strike: 12, follow: 25, recovery: 45 }, seconds: 0.8 };
{
  look: [0, 1.4, 4],
  weapon: {
    model: 'baseball_bat',
    lead: 'hand.R',
    // The thumb toward the working end, the palm on the weapon's right as it points ahead.
    hands: { 'hand.R': { seat: 0, into: [1, 0, 0], hands: 'grip' } },
  },
  free: { 'hand.L': { hands: 'fist' } },
  stances: {
    // The weapon hanging from a relaxed hand by the thigh, its end down and forward.
    idle: {
      body: body { 'thigh.L': [2, 0, 4], 'thigh.R': [0, 0, -4] },
      weapon: held([0.02, -0.46, 0.1], 25, 0, 80, [-0.73, 0, -0.68]),
      free: { 'hand.L': { at: [-0.03, -0.5, 0.06], pole: [0, 0, -1], twist: 0 } },
    },
    guard: guard,
  },
  strikes: {
    forehand: swing {
      windup: guard { body+: { spine: [4, -30, 0] }, weapon: held([-0.15, 0.01, 0.14], -60, -110, 100, [-1, -0.3, 0]) },
      hit: guard { body+: { spine: [10, 8, 0] }, weapon: held([0.1, -0.06, 0.42], -45, 0, 60) },
      follow: guard { body+: { spine: [12, 35, 0] }, weapon: held([0.4, -0.1, 0.25], 0, 100, -40, [-0.37, -0.93, 0]) },
    },
    backhand: swing {
      windup: guard { body+: { spine: [4, 35, 0] }, weapon: held([0.4, 0.05, 0.12], -55, 120, -100, [0.38, -0.92, 0]) },
      hit: guard { body+: { spine: [10, 0, 0] }, weapon: held([0, -0.05, 0.42], -45, -10, 40, [-0.57, -0.82, 0]) },
      follow: guard { body+: { spine: [12, -30, 0] }, weapon: held([-0.25, -0.05, 0.28], 2.5, -110, 80, [0.1, -1, 0]) },
    },
    overhead: swing {
      windup: guard { body+: { spine: [-10, 0, 0] }, weapon: held([0.05, 0.25, 0], -160, 0, 80, [-0.47, 0.28, 0.83]) },
      hit: guard { body+: { spine: [15, 8, 0] }, weapon: held([0.12, -0.05, 0.42], -42.5, 5, 80, [-0.41, -0.82, 0.41]) },
      follow: guard { body+: { spine: [25, 8, 0] }, weapon: held([0.14, -0.3, 0.3], -2.5, 5, 20, [-0.72, -0.24, -0.65]) },
    },
    thrust: {
      shares: { windup: 16, strike: 12, follow: 22, recovery: 50 },
      seconds: 0.7,
      windup: guard { body+: { spine: [4, -15, 0] }, weapon: held([-0.02, -0.25, 0.03], -7.5, 5, -137.5, [0.4, -0.8, -0.45]) },
      hit: guard { body+: { spine: [12, 15, 0] }, weapon: held([0.1, -0.1, 0.48], -30, -5, 60) },
      follow: guard { body+: { spine: [12, 12, 0] }, weapon: held([0.1, -0.12, 0.42], -30, -2.5, 60) },
    },
  },
}
