local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// Classical alchemy gear: hand-blown glassware, clay and iron heating ware, bench tools and the books and instruments
// of the laboratory. Glass vessels are drawn closed, as the clear finish shows what they hold.

// A flat bar `w` wide from [x, y] point `a` to `b`, `w0` wide at `a` and `w1` at `b`, from z0 to z1.
local barZ(id, slot, a, b, w0, w1, z0, z1) =
  local dx = b[0] - a[0], dy = b[1] - a[1], len = std.sqrt(dx * dx + dy * dy), nx = -dy / len / 2, ny = dx / len / 2;
  h.prism(id, slot, 'z', [[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0]], z0, z1);
// A round pipe slanting in the xy plane from [x, y] point `a` (radius ra) to `b` (radius rb), its axis at depth z. Pieces
// cannot rotate, so the pipe is three bars stacked in depth, each as wide as the round section at its depth: one
// continuous slanted solid that reads round from every side, rather than a stair of short cylinders.
local pipe(id, slot, a, b, ra, rb, z=0) =
  local rm = (ra + rb) / 2;
  [
    barZ('%s-%d' % [id, i], slot, a, b, 2 * ra * l[0], 2 * rb * l[0], z - rm * l[1], z + rm * l[1])
    for i in [0, 1, 2]
    for l in [[[0.92, 0.38], [0.71, 0.71], [0.38, 0.92]][i]]
  ];
// A ring on y between radii r0 and r1 from y0 to y1, centred at (x, z).
local ring(id, slot, r0, r1, y0, y1, x=0, z=0) = h.turned(id, slot, 'y', [[0, r0], [0, r1], [y1 - y0, r1], [y1 - y0, r0], [0, r0]], [x, y0, z]);
[
  // A glass alembic on its cucurbit, 310 mm tall: a gourd-shaped boiling flask 145 mm across holding half a litre,
  // its neck luted with clay into the still-head, a domed cap whose beak slopes 290 mm down to the right to carry
  // the distillate away.
  h.compound('alembic', 1.4, [
    h.turned('cucurbit', 'glass', 'y', [[0, 0], [0, 0.035], [0.01, 0.05], [0.04, 0.068], [0.08, 0.072], [0.12, 0.065], [0.15, 0.05], [0.175, 0.035], [0.2, 0.028], [0.225, 0.026], [0.225, 0]]),
    h.turned('liquor', 'liquor', 'y', [[0, 0], [0, 0.04], [0.025, 0.06], [0.055, 0.066], [0.055, 0]], [0, 0.004, 0]),
    ring('lute', 'lute', 0.024, 0.032, 0.2, 0.215),
    // The still-head: a skirt over the neck swelling into a dome, with the gutter ridge round its lower rim that
    // gathers the condensate into the beak.
    h.turned('head', 'glass', 'y', [[0, 0], [0, 0.03], [0.02, 0.033], [0.03, 0.055], [0.045, 0.066], [0.065, 0.062], [0.085, 0.048], [0.1, 0.028], [0.108, 0.01], [0.11, 0]], [0, 0.2, 0]),
    ring('gutter', 'glass', 0.03, 0.06, 0.226, 0.236),
  ] + pipe('beak', 'glass', [0.03, 0.236], [0.32, 0.15], 0.012, 0.005), {
    glass: 'glass-clear',
    liquor: 'resin-honey',
    lute: 'clay-terracotta',
  }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['glass'], setting: ['medieval'] } } },
]
