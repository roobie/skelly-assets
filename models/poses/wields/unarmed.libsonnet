// Bare fists, in an orthodox stance: the left foot and shoulder forward, the right fist by the chin and the left out in
// front of it, elbows down over the ribs. The jab is the lead hand's straight punch, quick and short; the hook is the
// rear hand's, thrown round by the trunk turning through, the elbow up level with the fist. Each fist turns palm down
// as it lands, so its knuckles meet the target.
local body = import 'body.libsonnet';
local legs = body { pelvis: [0, -15, 0], 'thigh.L': [18, 0, 4], 'thigh.R': [-8, 0, -6], 'shin.L': [12, 0, 0], 'shin.R': [14, 0, 0] };
local fist(at, pole, twist=0) = { at: at, pole: pole, twist: twist };
local guard = {
  body: legs { spine: [6, -20, 0] },
  free: { 'hand.R': fist([0.12, 0.1, 0.22], [-0.3, -1, 0]), 'hand.L': fist([-0.06, 0.1, 0.3], [0.3, -1, 0]) },
};
{
  look: [0, 1.4, 4],
  free: { 'hand.R': { hands: 'fist' }, 'hand.L': { hands: 'fist' } },
  stances: {
    // Standing easy, the hands hanging loosely closed by the thighs.
    idle: {
      body: body { 'thigh.L': [2, 0, 4], 'thigh.R': [0, 0, -4] },
      free: { 'hand.R': fist([0.03, -0.5, 0.06], [0, 0, -1]), 'hand.L': fist([-0.03, -0.5, 0.06], [0, 0, -1]) },
    },
    guard: guard,
  },
  strikes: {
    jab: {
      shares: { windup: 20, strike: 25, follow: 17, recovery: 38 },
      seconds: 0.45,
      windup: guard { body+: { spine: [8, -24, 0] }, free+: { 'hand.L': fist([-0.05, 0.08, 0.26], [0.3, -1, 0]) } },
      hit: guard { body+: { spine: [8, -35, 0] }, free+: { 'hand.L': fist([-0.12, 0.1, 0.5], [0.5, -1, 0], -60) } },
      follow: guard { body+: { spine: [8, -32, 0] }, free+: { 'hand.L': fist([-0.1, 0.1, 0.42], [0.5, -1, 0], -40) } },
    },
    hook: {
      shares: { windup: 20, strike: 25, follow: 17, recovery: 38 },
      seconds: 0.6,
      windup: guard { body+: { spine: [8, -32, 0] }, free+: { 'hand.R': fist([0.06, 0.06, 0.24], [-0.6, -1, 0]) } },
      hit: guard { body+: { spine: [8, 25, 0] }, free+: { 'hand.R': fist([0.3, 0.06, 0.3], [-1, 0.3, 0], -60) } },
      follow: guard { body+: { spine: [8, 38, 0] }, free+: { 'hand.R': fist([0.38, 0.04, 0.22], [-1, 0.2, 0], -50) } },
    },
  },
}
