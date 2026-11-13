// Two stone altars of one making, a temple's and a wayside's. Both are drawn by one `block` from their own measures: a
// stone table with a plinth, corner pilasters, a moulded cornice and an overhanging top slab, carrying the same plain
// roundel, so they read as one tradition at two sizes. The roundel is a ring round a boss, a sign of no real faith.
// The candles and the offering bowl are drawn by the same helpers on both for the same reason.
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

local round = { sides: null };

// A stone altar table standing on y from `y0`, centred on x at depth `z`, its front on +z. `m` holds the body's
// width and depth, the height to the top of its slab and how far each moulding stands out. Slots: stone, trim.
local block(m, y0, z) =
  local w = m.width / 2, d = m.depth / 2, top = y0 + m.height;
  local slab = top - m.slab.thick, cornice = slab - m.cornice.height, plinth = y0 + m.plinth.height;
  local out(o, ya, yb, slot, id) = box(id, slot, [-w - o, ya, z - d - o], [w + o, yb, z + d + o]);
  [
    out(m.plinth.out, y0, plinth, 'trim', 'plinth'),
    out(m.plinth.out / 2, plinth, plinth + m.plinth.height / 3, 'trim', 'plinth-step'),
    out(0, plinth, cornice, 'stone', 'body'),
    // A band round the body under the cornice and one over the plinth frame each face's panel.
    out(m.band.out, plinth + m.plinth.height / 3, plinth + m.plinth.height / 3 + m.band.height, 'stone', 'band-low'),
    out(m.band.out, cornice - m.band.height, cornice, 'stone', 'band-high'),
    out(m.cornice.out / 2, cornice, cornice + m.cornice.height / 2, 'trim', 'cornice-low'),
    out(m.cornice.out, cornice + m.cornice.height / 2, slab, 'trim', 'cornice-high'),
    out(m.slab.out, slab, top, 'trim', 'slab'),
  ] + [
    // A pilaster at each corner, standing proud of both faces it turns.
    local p = m.pilaster;
    box('pilaster-%d-%d' % [(sx + 1) / 2, (sz + 1) / 2], 'stone',
        [std.min(sx * (w - p.width), sx * (w + p.out)), plinth, z + std.min(sz * (d - p.width), sz * (d + p.out))],
        [std.max(sx * (w - p.width), sx * (w + p.out)), cornice, z + std.max(sz * (d - p.width), sz * (d + p.out))])
    for sx in [-1, 1]
    for sz in [-1, 1]
  ];

// The roundel carved on a front face at `face` (its z), centred at (x, y): a raised disc, a ring standing out round
// it and a bronze boss set in the middle, all in proportion to its radius `r`. Slots: carve, boss.
local roundel(x, y, face, r) = [
  h.turned('roundel-disc', 'carve', 'z', [[0, 0], [0, r * 0.8], [r * 0.06, r * 0.8], [r * 0.06, 0]], [x, y, face]) + round,
  h.turned('roundel-ring', 'carve', 'z', [[0, r * 0.8], [0, r], [r * 0.14, r], [r * 0.14, r * 0.8], [0, r * 0.8]], [x, y, face]) + round,
  h.turned('roundel-boss', 'boss', 'z', [[0, 0], [0, r * 0.28], [r * 0.18, r * 0.28], [r * 0.18, 0]], [x, y, face]) + round,
];

// A candle `r` round and `tall` standing on y0 at (x, z), wax pooled at its foot and its flame lit. Slots: wax, flame.
local candle(id, x, z, y0, r, tall) = [
  h.turned(id + '-pool', 'wax', 'y', [[0, 0], [0, r * 1.5], [r * 0.15, r * 1.3], [r * 0.3, 0]], [x, y0, z]) + round,
  h.turned(id, 'wax', 'y', [[0, 0], [0, r], [tall - r * 0.2, r], [tall, r * 0.75], [tall, 0]], [x, y0, z]) + round,
  h.turned(id + '-flame', 'flame', 'y', [[0, 0], [r * 0.25, r * 0.4], [r * 0.9, r * 0.32], [r * 1.9, 0]], [x, y0 + tall, z]) + round,
];

// A shallow bronze offering bowl `r` in radius on a foot, standing on y0 at (x, z), with an offering lying in it.
// Slots: bowl and fill.
local bowl(x, z, y0, r) = [
  h.turned('bowl', 'bowl', 'y', [
    [0, 0], [0, r * 0.4], [r * 0.12, r * 0.32], [r * 0.2, r * 0.45], [r * 0.38, r * 0.85], [r * 0.5, r], [r * 0.56, r],
    [r * 0.56, r * 0.94], [r * 0.46, r * 0.82], [r * 0.3, r * 0.5], [r * 0.3, 0],
  ], [x, y0, z]) + round,
  h.turned('bowl-fill', 'fill', 'y', [[0, 0], [0, r * 0.7], [r * 0.08, r * 0.55], [r * 0.12, 0]], [x, y0 + r * 0.3, z]) + round,
];

// A turned bronze candlestick standing on y0 at (x, z), `tall` to its drip pan, its candle `r` round. Slots: bowl, wax,
// flame.
local candlestick(id, x, z, y0, tall, r, candleTall) = [
  h.turned(id, 'bowl', 'y', [
    [0, 0], [0, r * 2.6], [tall * 0.05, r * 2.4], [tall * 0.12, r * 1.1], [tall * 0.2, r * 0.6], [tall * 0.55, r * 0.5],
    [tall * 0.6, r * 1.0], [tall * 0.65, r * 0.5], [tall * 0.93, r * 0.45], [tall * 0.95, r * 1.8], [tall, r * 1.9], [tall, 0],
  ], [x, y0, z]) + round,
] + candle(id + '-candle', x, z, y0 + tall, r, candleTall);

// Metres and kilograms. A temple altar, a two-stepped dais with its altar set back on it, so the officiant has room to
// stand behind; and a wayside altar with an offering ledge and an upright stone carrying the roundel at the back.
local temple = {
  dais: [{ width: 2.9, depth: 2.4, height: 0.16 }, { width: 2.5, depth: 2.0, height: 0.16 }],
  // How far the altar sits back from the dais's middle.
  back: 0.2,
  altar: {
    width: 1.9, depth: 0.8, height: 1.0,
    plinth: { height: 0.12, out: 0.06 },
    band: { height: 0.07, out: 0.012 },
    pilaster: { width: 0.16, out: 0.03 },
    cornice: { height: 0.08, out: 0.05 },
    slab: { thick: 0.1, out: 0.1 },
  },
  roundel: 0.27,
  // The cloth along the top, hanging over each end.
  cloth: { width: 0.7, drop: 0.38, thick: 0.006, hem: 0.04 },
  candlestick: { at: 0.75, tall: 0.36, r: 0.04, candle: 0.3 },
  bowl: 0.24,
  mass: 7200,
};
local wayside = {
  altar: {
    width: 0.6, depth: 0.4, height: 0.8,
    plinth: { height: 0.08, out: 0.03 },
    band: { height: 0.04, out: 0.006 },
    pilaster: { width: 0.07, out: 0.015 },
    cornice: { height: 0.05, out: 0.025 },
    slab: { thick: 0.06, out: 0.05 },
  },
  // The offering ledge across the back of the top, and the upright stone behind it, crowned by
  // courses each `crown.height` tall that step in by `crown.step` a side, the lowest overhanging it by `crown.over`.
  ledge: { depth: 0.12, height: 0.09 },
  stele: { width: 0.5, thick: 0.1, height: 0.4 },
  crown: { courses: 3, height: 0.04, step: 0.07, over: 0.02 },
  roundel: 0.15,
  candles: [{ x: -0.19, r: 0.024, tall: 0.11 }, { x: 0.15, r: 0.028, tall: 0.15 }, { x: 0.22, r: 0.02, tall: 0.07 }],
  bowl: 0.1,
  mass: 520,
};

taxonomy.inherit({ category: 'arcana', tags: { material: ['stone'] }, keywords: ['shrine', 'religious'] }, [
  // A temple altar 2.1 m across its top slab, on a dais of two steps 2.9 by 2.4 m and 1.32 m tall to the slab: a
  // stone table with a roundel on its front, a cloth laid along its top and hanging over the ends, a candlestick at each
  // end and a bowl of embers between them.
  local m = temple, a = m.altar, y0 = m.dais[0].height + m.dais[1].height, z = -m.back, top = y0 + a.height;
  local c = m.cloth, slabW = a.width / 2 + a.slab.out, slabD = a.depth / 2 + a.slab.out;
  h.compound('temple_altar', m.mass, [
    box('dais-%d' % i, 'trim', [-m.dais[i].width / 2, std.sum([s.height for s in m.dais[:i]]), -m.dais[i].depth / 2], [m.dais[i].width / 2, std.sum([s.height for s in m.dais[:i + 1]]), m.dais[i].depth / 2])
    for i in [0, 1]
  ] + block(a, y0, z) + roundel(0, y0 + a.plinth.height + (a.height - a.plinth.height - a.slab.thick) / 2, z + a.depth / 2 + a.band.out, m.roundel) + [
    box('cloth-top', 'cloth', [-slabW - c.thick, top, z - c.width / 2], [slabW + c.thick, top + c.thick, z + c.width / 2]),
  ] + std.flattenArrays([
    [
      box('cloth-drop-%d' % ((s + 1) / 2), 'cloth', [std.min(s * slabW, s * (slabW + c.thick)), top - c.drop + c.hem, z - c.width / 2], [std.max(s * slabW, s * (slabW + c.thick)), top + c.thick, z + c.width / 2]),
      box('cloth-hem-%d' % ((s + 1) / 2), 'hem', [std.min(s * slabW, s * (slabW + c.thick)), top - c.drop, z - c.width / 2], [std.max(s * slabW, s * (slabW + c.thick)), top - c.drop + c.hem, z + c.width / 2]),
    ]
    for s in [-1, 1]
  ]) + std.flattenArrays([
    candlestick('candlestick-%d' % ((s + 1) / 2), s * m.candlestick.at, z, top + c.thick, m.candlestick.tall, m.candlestick.r, m.candlestick.candle)
    for s in [-1, 1]
  ]) + bowl(0, z, top + c.thick, m.bowl), {
    stone: 'stone-grey',
    trim: 'stone-whet',
    carve: 'stone-whet',
    boss: 'bronze',
    cloth: 'cloth-crimson',
    hem: 'cloth-saffron',
    bowl: 'bronze',
    fill: 'glow-flame',
    wax: 'wax-ivory',
    flame: 'glow-flame',
  }) + { title: 'Temple altar' },

  // A wayside altar 0.7 m across its top slab and 0.8 m tall to it: the same stone table at a shrine's size, an
  // offering ledge across the back of its top carrying three candles burnt to different heights, an upright stone
  // behind with the roundel on it, and a small offering bowl of dried petals at the front of the slab.
  local m = wayside, a = m.altar, top = a.height, back = -a.depth / 2 - a.slab.out;
  local l = m.ledge, s = m.stele, ledgeTop = top + l.height, steleFront = back + s.thick;
  h.compound('wayside_altar', m.mass, block(a, 0, 0) + [
    box('ledge', 'trim', [-a.width / 2, top, steleFront], [a.width / 2, ledgeTop, steleFront + l.depth]),
    box('stele', 'stone', [-s.width / 2, top, back], [s.width / 2, ledgeTop + s.height, steleFront]),
  ] + [
    local k = m.crown, half = s.width / 2 + k.over - i * k.step, y = ledgeTop + s.height + i * k.height;
    box('crown-%d' % i, 'trim', [-half, y, back - k.over / 2], [half, y + k.height, steleFront + k.over / 2])
    for i in std.range(0, m.crown.courses - 1)
  ] + roundel(0, ledgeTop + s.height * 0.5, steleFront, m.roundel) + std.flattenArrays([
    candle('candle-%d' % i, m.candles[i].x, steleFront + l.depth / 2, ledgeTop, m.candles[i].r, m.candles[i].tall)
    for i in std.range(0, std.length(m.candles) - 1)
  ]) + bowl(0, a.depth / 2 + a.slab.out - m.bowl - 0.02, top, m.bowl), {
    stone: 'stone-grey',
    trim: 'stone-whet',
    carve: 'stone-whet',
    boss: 'bronze',
    bowl: 'bronze',
    fill: 'petal-dried',
    wax: 'wax-ivory',
    flame: 'glow-flame',
  }) + { title: 'Wayside altar', voxelGrain: 0.006 },
])
