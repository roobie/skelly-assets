// Both hands on a heavy club or long blade, the left by the end of the handle and the right above it, the left foot
// leading. The guard holds the weapon up before the body; the overhead comes down from over the head, the side swing
// cuts across from the right, the thrust drives the end straight out. Heavy strikes wind up longer than one hand's.
local body = import 'body.libsonnet';
local legs = body { pelvis: [0, -10, 0], 'thigh.L': [18, 0, 4], 'thigh.R': [-8, 0, -6], 'shin.L': [12, 0, 0], 'shin.R': [14, 0, 0] };
local held(at, pitch, yaw, roll=0, right=[-0.6, -1, 0], left=[0.6, -1, 0]) = {
  at: at,
  aim: { pitch: pitch, yaw: yaw, roll: roll },
  poles: { 'hand.R': right, 'hand.L': left },
};
local guard = { body: legs { spine: [6, -10, 0] }, weapon: held([0.2, -0.25, 0.3], -55, 10, 60) };
local heavy = { shares: { windup: 22, strike: 13, follow: 25, recovery: 40 }, seconds: 1.1 };
{
  look: [0, 1.4, 4],
  weapon: {
    model: 'baseball_bat',
    lead: 'hand.R',
    // A hand's width apart, both thumbs toward the working end.
    hands: {
      'hand.L': { seat: 0, into: [1, 0, 0], hands: 'grip' },
      'hand.R': { seat: 0.09, into: [1, 0, 0], hands: 'grip' },
    },
  },
  stances: {
    // The weapon carried low across the body, its end down by the left foot.
    idle: { body: body { 'thigh.L': [2, 0, 4], 'thigh.R': [0, 0, -4] }, weapon: held([0.18, -0.42, 0.18], 20, 25, 80, [-0.74, -0.67, 0], [-0.47, -0.79, -0.39]) },
    guard: guard,
  },
  strikes: {
    overhead: heavy {
      windup: guard { body+: { spine: [-10, -5, 0] }, weapon: held([0.2, 0.2, 0], -170, 0, 130, [-0.3, 0.49, 0.82], [0.72, 0.36, 0.6]) },
      hit: guard { body+: { spine: [18, 0, 0] }, weapon: held([0.22, -0.2, 0.42], -7.5, 0, 90, [-0.6, -1, 0], [0.1, -1, 0]) },
      follow: guard { body+: { spine: [28, 0, 0] }, weapon: held([0.22, -0.4, 0.26], 17.5, 0, 90, [-0.6, -1, 0], [-0.37, -0.93, 0]) },
    },
    side: heavy {
      windup: guard { body+: { spine: [4, -40, 0] }, weapon: held([0.07, -0.08, 0.09], -70, -140, -60, [-0.91, -0.27, 0.31], [0.3, -1, 0]) },
      hit: guard { body+: { spine: [10, 0, 0] }, weapon: held([0.22, -0.15, 0.4], -25, 5, 110) },
      follow: guard { body+: { spine: [12, 40, 0] }, weapon: held([0.45, -0.07, 0.2], 0, 110, 0, [-0.3, -1, 0], [-0.2, -0.98, 0]) },
    },
    thrust: {
      shares: { windup: 16, strike: 12, follow: 22, recovery: 50 },
      seconds: 0.9,
      windup: guard { body+: { spine: [4, -15, 0] }, weapon: held([0.15, -0.3, 0.05], -10, 5, 80, left=[0.1, -1, 0]) },
      hit: guard { body+: { spine: [12, 5, 0] }, weapon: held([0.22, -0.15, 0.44], -15, 5, 60, [-0.6, -1, 0], [0.1, -1, 0]) },
      follow: guard { body+: { spine: [12, 0, 0] }, weapon: held([0.22, -0.18, 0.42], -10, 5, 70, [-0.6, -1, 0], [0.1, -1, 0]) },
    },
  },
}
