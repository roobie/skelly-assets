local h = import '../compound.libsonnet';
local box = h.box;
// A 2 by 4 board lying flat along x from 0 to `len`: 89 mm wide on z, 38 mm thick on y, with darker sawn end grain and
// a few grain streaks painted flush on its top face. Slots: board, end, grain.
local board(len, w=0.089, t=0.038) = [
  box('board', 'board', [0.003, 0, -w / 2], [len - 0.003, t, w / 2]),
  box('end-a', 'end', [0, 0, -w / 2], [0.003, t, w / 2]),
  box('end-b', 'end', [len - 0.003, 0, -w / 2], [len, t, w / 2]),
] + [
  box('grain-%d' % i, 'grain', [len * g[0], t - 0.002, g[2] - 0.002], [len * g[1], t + 0.0005, g[2] + 0.002])
  for i in std.range(0, 3)
  for g in [[[0.05, 0.62, -0.024], [0.3, 0.95, 0.008], [0.12, 0.45, 0.026], [0.55, 0.9, -0.012]][i]]
];
local boardFinish = { board: 'wood-pine', end: 'wood-birch', grain: 'wood-birch' };
local gripAt(id, solid, f) = h.gripOn(id, solid) + { fraction: [f, 0.5, 0.5] };
[
  // A ten-foot hardwood pole, 3050 mm long and 40 mm across, tapering to 34 mm at the top, with a worn end.
  h.compound('long_pole', 2.25, [
    h.turned('pole', 'pole', 'x', [[0, 0], [0, 0.018], [0.006, 0.02], [3.0, 0.017], [3.05, 0.015], [3.05, 0]], [0, 0.02, 0]),
    h.turned('butt', 'end', 'x', [[0, 0], [0, 0.016], [0.002, 0.016], [0.002, 0]], [-0.0015, 0.02, 0]),
  ], { pole: 'wood-birch', end: 'wood-oak' }) + {
    handling: gripAt('long_pole', 'pole', 0.3),
    taxonomy: { tags: { weapon: ['polearm'], material: ['wood'] } },
  },
]
