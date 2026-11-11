// The band head gear's straps go round the player bust's hair. The bust draws a ring of hair just above its
// hairline (`hairRing`) as whole voxels of its own lattice, so its drawn surface there is exactly the plan below rather
// than the voxeliser's sampling of a curve; each strap (`strap`) is then that plan grown by one of the strap's own
// voxels, the least gap a strap drawn on its lattice can leave without touching the hair, and no more.
local bust = import 'models/measures/bust.libsonnet';

local grain = bust.voxelGrain;
local crown = bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight + bust.neckHeight;
local hairLine = crown + bust.headHeight - bust.hairCover;
// Lattice positions count whole cells; the tolerance absorbs the rounding of a measure that lies on a lattice line.
local cellsUp(length, cell) = std.ceil(length / cell - 1e-9);
local cellsDown(length, cell) = std.floor(length / cell + 1e-9);

// The ring covers whole head layers from the first lattice line at or above the hairline: two, about a strap's width.
local ringLayers = 2;
local ringBottom = cellsUp(hairLine, grain) * grain;
local ringTop = ringBottom + ringLayers * grain;

// The hair's plan at the hairline: the pelt round the skull and the dome's foot, which sits further back. A cell is
// in the ring where its centre lies within the plan widened by a tenth of a grain, more than the voxeliser moves a
// sample off a cell's centre, so the ring covers every cell the faceted hair under it fills.
local halfX = bust.headWidth / 2 + bust.hairThickness;
local halfZ = bust.headDepth / 2 + bust.hairThickness;
local margin = grain / 10;
// The pelt's half width at `t` from its centre along z, negative beyond its ends.
local peltHalfWidth(t) =
  if t <= 0 then halfX
  else if t >= halfZ then -1
  else halfX * std.pow(1 - std.pow(t / halfZ, bust.facePower), 1 / bust.facePower);
local planHalfWidth(z) = std.max(
  peltHalfWidth(std.abs(z) - margin),
  peltHalfWidth(std.abs(z + bust.hairSweep) - margin),
);
// Rows of the ring in head cells: row `k` spans z from k to k + 1 and x from -cells to cells.
local rows = [
  { k: k, cells: std.floor((planHalfWidth((k + 0.5) * grain) + margin) / grain + 0.5) }
  for k in std.range(cellsDown(-halfZ - bust.hairSweep, grain) - 1, cellsUp(halfZ, grain))
];
local ring = std.filter(function(row) row.cells > 0, rows);

// The deadvox head frame's height in the bust model and its turn about y, and where the game wears each band-fitted
// model in that frame. The turns are copied from the consumer, roobie/skelly: the frame's from
// `packages/mods/skelly.body/figures-player.jsonnet`, `head`, and each model's `at` and `turn` from
// `packages/mods/skelly.electric-power/electric-power-items.jsonnet`, `figureModels`.
local frame = { height: crown + bust.neckOverlap + bust.headFrameRise, turn: 180 };
local worn = {
  night_vision_goggles: { at: 0.04, turn: 180 },
  headlamp: { at: 0.055, turn: 180 },
};

{
  frame: frame,
  worn: worn,

  // The bust's ring of hair, in the bust model frame: its height and its rows as [back, front, half width].
  hairRing:: {
    bottom: ringBottom,
    top: ringTop,
    rows: [[row.k * grain, (row.k + 1) * grain, row.cells * grain] for row in ring],
  },

  // The strap of `model`, `wall` thick, drawn at the strap grain `cell`, as boxes in its authored frame, which the build
  // turns by `forward` degrees about y to face +z, with its `strap_<side>_inner` and `_outer` anchor points. A gear model
  // is turned by half turns at most, so its lattice keeps the head's lines and the strap's faces can lie on them.
  strap(model, cell, wall, forward=0)::
    local per = std.round(grain / cell);
    assert std.abs(per * cell - grain) < 1e-12 : 'the strap grain must divide the head grain';
    local thick = std.round(wall / cell);
    assert thick > 0 && std.abs(thick * cell - wall) < 1e-12 : 'the wall must be whole strap cells';
    local turn = (frame.turn + worn[model].turn + forward) % 360;
    assert turn == 0 || turn == 180 : 'a band-fitted model is worn square to the head';
    local flip = if turn == 0 then 1 else -1;
    local lift = frame.height + worn[model].at;
    local bottom = cellsUp(ringBottom - lift, cell) * cell;
    local top = cellsDown(ringTop - lift, cell) * cell;
    // The plan grown by `out` strap cells, at strip `j` (z from j to j + 1 strap cells): its half width there, or null.
    local grown(j, out) = std.foldl(
      function(widest, row)
        if row.k * per - out <= j && j + 1 <= (row.k + 1) * per + out
        then std.max(if widest == null then 0 else widest, row.cells * per + out)
        else widest,
      ring,
      null,
    );
    local strips = [
      { j: j, inner: grown(j, 1), outer: grown(j, 1 + thick) }
      for j in std.range(ring[0].k * per - 1 - thick, (ring[std.length(ring) - 1].k + 1) * per + thick)
    ];
    // Strips with the same widths make one run, so the strap is a few boxes rather than one per strip.
    local runs = std.foldl(
      function(done, strip)
        local last = if std.length(done) == 0 then null else done[std.length(done) - 1];
        if last != null && last.inner == strip.inner && last.outer == strip.outer
        then done[:std.length(done) - 1] + [last { end: strip.j + 1 }]
        else done + [{ start: strip.j, end: strip.j + 1, inner: strip.inner, outer: strip.outer }],
      std.filter(function(strip) strip.outer != null, strips),
      [],
    );
    local piece(id, xs, run) = {
      local x = [flip * xs[0] * cell, flip * xs[1] * cell],
      local z = [flip * run.start * cell, flip * run.end * cell],
      id: id,
      min: [std.min(x[0], x[1]), bottom, std.min(z[0], z[1])],
      max: [std.max(x[0], x[1]), top, std.max(z[0], z[1])],
    };
    local sideRun = std.filter(function(i) runs[i].start <= 0 && 0 < runs[i].end, std.range(0, std.length(runs) - 1))[0];
    // Where an inner or outer face lies across a piece, as a fraction of its box in the authored frame.
    local across(fraction) = if flip == 1 then fraction else 1 - fraction;
    local anchor(id, inner, outer) = {
      inner: { solid: id, fraction: inner },
      outer: { solid: id, fraction: outer },
    };
    {
      pieces: std.flattenArrays([
        local run = runs[i];
        if run.inner == null then [piece(if run.start > 0 then 'strap-front' else 'strap-back', [-run.outer, run.outer], run)]
        else [
          piece('strap-%d-left' % i, [run.inner, run.outer], run),
          piece('strap-%d-right' % i, [-run.outer, -run.inner], run),
        ]
        for i in std.range(0, std.length(runs) - 1)
      ]),
      local sides = {
        left: anchor('strap-%d-left' % sideRun, [across(0), 0.5, 0.5], [across(1), 0.5, 0.5]),
        right: anchor('strap-%d-right' % sideRun, [across(1), 0.5, 0.5], [across(0), 0.5, 0.5]),
        front: anchor('strap-front', [0.5, 0.5, across(0)], [0.5, 0.5, across(1)]),
        back: anchor('strap-back', [0.5, 0.5, across(1)], [0.5, 0.5, across(0)]),
      },
      anchors: {
        ['strap_%s_%s' % [side, face]]: sides[side][face]
        for side in std.objectFields(sides)
        for face in ['inner', 'outer']
      },
    },
}
