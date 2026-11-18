// The surface looks a finish can take: every number a surface kind's shader reads (tools/packages/surfaces/src/schema.ts,
// SurfaceSchema). `kind` names the shader; a look is that shader's tuning, so tuning bark is a content edit and a new
// kind is code. The looks are in metres and bark is bark, so one look serves a twig and a trunk alike.
local noMarks = { cellAcross: 0.05, cellAlong: 0.05, across: 0.5, along: 0.5, density: 0, depth: 0 };

local furrowed = {
  kind: 'bark',
  // A standing trunk's furrows run up it.
  grain: 'up',
  furrow: { spacing: 0.06, width: 0.18, depth: 0.35, wander: 0.35, wanderLength: 0.6 },
  plate: { length: 0.22, crack: 0.08, crackDepth: 0.25, spread: 0.12, tilt: 0.25 },
  relief: 0.8,
  mottle: { span: 0.8, amount: 0.12 },
  lenticels: noMarks,
  patches: noMarks,
  fade: { from: 0.25, to: 0.6 },
};

local broad = {
  kind: 'leaf',
  shape: 'broad',
  // Solid for everyone: only the local view, near its own player, opens leaves (the game's inputs).
  coverage: 1,
  cell: 0.08,
  jitter: 0.9,
  spread: 0.12,
  tilt: 0.35,
  edge: { width: 0.12, depth: 0.3 },
  needles: 1,
  fade: { from: 0.25, to: 0.6 },
};

local looks = {
  'bark-furrowed': furrowed,
  // A felled log, stick or pole lies down, so its furrows run along its longest side.
  'bark-log': std.mergePatch(furrowed, { grain: 'main' }),
  // Smooth pale bark, barely furrowed, with dark lenticels across the grain and sparse dark patches.
  'bark-birch': std.mergePatch(furrowed, {
    furrow: { spacing: 0.08, width: 0.05, depth: 0.08, wander: 0.2 },
    plate: { length: 0.3, crack: 0.05, crackDepth: 0.05, spread: 0.04, tilt: 0.05 },
    relief: 0.2,
    mottle: { span: 0.5, amount: 0.06 },
    lenticels: { cellAcross: 0.06, cellAlong: 0.035, across: 0.7, along: 0.12, density: 0.45, depth: 0.6 },
    patches: { cellAcross: 0.35, cellAlong: 0.3, across: 0.6, along: 0.45, density: 0.2, depth: 0.55 },
  }),
  'leaf-broad': broad,
  'leaf-needle': std.mergePatch(broad, {
    shape: 'needle',
    cell: 0.05,
    spread: 0.08,
    edge: { width: 0.35, depth: 0.35 },
    needles: 5,
  }),
};
{
  looks: looks,
  // A finish's surface in the `look`, with `tune` patched over the look's values; add it to a material.
  wear(look, tune={}):: { finish+: { surface: std.mergePatch(looks[look], tune) } },
}
