// Both hands on a heavy club or long blade, the left by the end of the handle and the right above it, the left foot
// leading. The guard holds the weapon cocked, the hands up by the right shoulder and the end tipped back, loaded to
// swing, the hands and the handle in a first-person view; the overhead comes down from over the head, the side swing
// cuts across from the right, the thrust drives the end straight out. Heavy strikes wind up longer than one hand's.
local body = import 'body.libsonnet';
local hand = import 'models/measures/hand.libsonnet';
local wield = import 'models/measures/wield.libsonnet';
local legs = body { pelvis: [0, -10, 0], 'thigh.L': [18, 0, 4], 'thigh.R': [-8, 0, -6], 'shin.L': [12, 0, 0], 'shin.R': [14, 0, 0] };
local held(at, pitch, yaw, roll=0, right=[-0.6, -1, 0], left=[0.6, -1, 0]) = {
  at: at,
  aim: { pitch: pitch, yaw: yaw, roll: roll },
  poles: { 'hand.R': right, 'hand.L': left },
};
local guard = { body: legs { spine: [6, -10, 0] }, weapon: held([0.25, 0.14, 0.32], -105, 10, 60) };
local heavy = { shares: { windup: 22, strike: 13, follow: 25, recovery: 40 }, seconds: 1.1 };
{
  look: [0, 1.4, 4],
  weapon: {
    model: 'baseball_bat',
    lead: 'hand.R',
    // A hand's width apart, both thumbs toward the working end, each where a game's fist holds it.
    hands: {
      'hand.L': { seat: 0, into: [1, 0, 0], grip: hand.fistShare, hands: 'grip' },
      'hand.R': { seat: wield.twoHand.leadSeat, into: [1, 0, 0], grip: hand.fistShare, hands: 'grip' },
    },
  },
  stances: {
    // The weapon carried low across the body, its end down by the left foot.
    idle: { body: body { 'thigh.L': [2, 0, 4], 'thigh.R': [0, 0, -4] }, weapon: held([0.19, -0.42, 0.17], 20, 25, 80, [-0.74, -0.67, 0], [-0.47, -0.79, -0.39]) },
    guard: guard,
  },
  // Walked as the idle stands, both hands on the weapon: swung in one hand, a two-hand weapon hangs into the body. It
  // leans with the body, which keeps the left hand within reach of the handle's end in the crouch walk.
  walks: { idle: { arms: 'held', lean: 1 } },
  strikes: {
    overhead: heavy {
      windup: guard { body+: { spine: [-10, -5, 0] }, weapon: held([0.2, 0.2, 0], -170, 0, 106, [-0.3, 0.49, 0.82], [0.72, 0.36, 0.6]) },
      // Through the hit and follow, as through the thrust's, the handle rolls toward the thumbs, and at the hit the end
      // rides a little high, with the left elbow out and back: the left hand, at the handle's end, then closes on it
      // without bending past its wrist. At the follow the right elbow tucks back, so the hand reaches the low handle.
      hit: guard { body+: { spine: [18, 0, 0] }, weapon: held([0.22, -0.2, 0.42], -25, 0, 80, [-0.6, -1, 0], [0.4, -0.5, -0.6]) },
      follow: guard { body+: { spine: [28, 0, 0] }, weapon: held([0.22, -0.4, 0.24], 10, 0, 74, [-0.6, -1, -0.3], [0.4, -0.5, -0.6]) },
    },
    side: heavy {
      windup: guard { body+: { spine: [4, -40, 0] }, weapon: held([0.07, -0.08, 0.11], -70, -140, -54, [-0.91, -0.27, 0.31], [0.3, -1, 0]) },
      // The left elbow drops back through the hit and lifts forward through the follow, so the left wrist, at the
      // handle's end, keeps square to the handle as it sweeps across.
      hit: guard { body+: { spine: [10, 0, 0] }, weapon: held([0.22, -0.15, 0.4], -25, 5, 110, left=[0.6, -1, -0.25]) },
      follow: guard { body+: { spine: [12, 50, 0] }, weapon: held([0.43, -0.06, 0.22], 0, 112, -12, [-0.3, -1, 0], [-0.2, -0.98, 0.6]) },
    },
    thrust: {
      shares: { windup: 16, strike: 12, follow: 22, recovery: 50 },
      seconds: 0.9,
      windup: guard { body+: { spine: [4, -15, 0] }, weapon: held([0.15, -0.3, 0.05], -10, 5, 80, left=[0.1, -1, 0]) },
      hit: guard { body+: { spine: [12, 5, 0] }, weapon: held([0.2, -0.15, 0.43], -25, 5, 80, [-0.6, -1, 0], [0.4, -0.5, -0.6]) },
      follow: guard { body+: { spine: [12, 0, 0] }, weapon: held([0.22, -0.18, 0.41], -16, 5, 86, [-0.6, -1, 0], [0.1, -1, 0]) },
    },
  },
}
