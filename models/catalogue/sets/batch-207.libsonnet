local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// Classical alchemy gear: hand-blown glassware, clay and iron heating ware, bench tools and the books and instruments
// of the laboratory. Glass vessels are drawn closed, as the clear finish shows what they hold.

// A flat bar `w` wide lying in the xz plane from [x, z] point `a` to `b`, from y0 to y1.
local barY(id, slot, a, b, w, y0, y1) =
  local dx = b[0] - a[0], dz = b[1] - a[1], len = std.sqrt(dx * dx + dz * dz), nx = -dz / len * w / 2, nz = dx / len * w / 2;
  h.prism(id, slot, 'y', [[a[1] + nz, a[0] + nx], [b[1] + nz, b[0] + nx], [b[1] - nz, b[0] - nx], [a[1] - nz, a[0] - nx]], y0, y1);
// A ring on y between radii r0 and r1 from y0 to y1, centred at (x, z).
local ring(id, slot, r0, r1, y0, y1, x=0, z=0) = h.turned(id, slot, 'y', [[0, r0], [0, r1], [y1 - y0, r1], [y1 - y0, r0], [0, r0]], [x, y0, z]);
// A hollow turned vessel standing on y: outer [height, radius] points from the base up to the rim, then the wall
// `t` thick coming back down to a floor `t` thick, so the open mouth shows inside.
local vessel(id, slot, outer, t, origin=[0, 0, 0]) =
  local top = outer[std.length(outer) - 1];
  h.turned(id, slot, 'y', [[0, 0]] + outer + [[top[0], top[1] - t]] + [[if p[0] == 0 then t else p[0], p[1] - t] for p in std.reverse(outer[0:std.length(outer) - 1])] + [[t, 0]], origin);
// A round-bodied flask standing on y at (x, z): a ball of radius r centred at height cy, drawn up into a neck of radius
// neckR that ends at height `top`.
local bulb(id, slot, r, cy, neckR, top, x=0, z=0) =
  local a1 = std.pi - std.asin(neckR / r);
  h.turned(id, slot, 'y', [[cy - r, 0]] + [[cy - r * std.cos(a1 * i / 10), r * std.sin(a1 * i / 10)] for i in std.range(1, 10)] + [[top, neckR], [top, 0]], [x, 0, z]);
// Marks a turned piece round rather than faceted.
local round = { sides: null };
// One turn of a copper worm lying on y at height y: a ring of radius R and tube radius r, its section a diamond as the
// coil family draws it.
local turn(id, slot, R, r, y) = h.turned(id, slot, 'y', [[0, R], [r, R + r], [2 * r, R], [r, R - r], [0, R]], [0, y, 0]);
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
  ] + h.pipe('beak', 'glass', [[0.03, 0.236], [0.32, 0.15]], [0.012, 0.005]), {
    glass: 'glass-clear',
    liquor: 'resin-honey',
    lute: 'clay-terracotta',
  }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['glass'], setting: ['medieval'] } } },

  // A gourd-shaped glass boiling flask 145 mm across and 230 mm tall, its short neck ending in a rolled lip, empty.
  h.compound('cucurbit', 0.5, [
    h.turned('cucurbit', 'glass', 'y', [[0, 0], [0, 0.035], [0.01, 0.05], [0.04, 0.068], [0.08, 0.072], [0.12, 0.065], [0.15, 0.05], [0.175, 0.035], [0.2, 0.028], [0.225, 0.026], [0.225, 0]]),
    ring('lip', 'glass', 0.02, 0.03, 0.22, 0.23),
  ], { glass: 'glass-clear' }) + h.inHand('cucurbit', 'cucurbit') + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['glass'], setting: ['medieval'] } } },

  // A round glass receiver 160 mm across with a 130 mm neck, sitting in a plaited straw ring, a little distillate in
  // the bottom of the ball.
  h.compound('receiver_flask', 0.7, [
    bulb('flask', 'glass', 0.08, 0.095, 0.018, 0.3),
    ring('lip', 'glass', 0.014, 0.022, 0.292, 0.3),
    h.turned('distillate', 'liquor', 'y', [[0, 0], [0, 0.022], [0.015, 0.05], [0.035, 0.065], [0.035, 0]], [0, 0.02, 0]),
    ring('straw', 'straw', 0.03, 0.055, 0, 0.022),
  ], { glass: 'glass-clear', liquor: 'resin-honey', straw: 'straw-wicker' }) + h.inHand('receiver_flask', 'flask') + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['glass'], setting: ['medieval'] } } },

  // A glass retort 150 mm across the bulb in a straw ring: its neck rises off the top, bends over and runs 350 mm
  // down to the right, tapering to a narrow open tip.
  h.compound('retort', 0.65, [
    bulb('bulb', 'glass', 0.075, 0.09, 0.02, 0.15),
    ring('straw', 'straw', 0.03, 0.05, 0, 0.022),
  ] + h.pipe('neck', 'glass', [[-0.01, 0.15], [0.07, 0.205], [0.38, 0.05]], [0.02, 0.017, 0.007]), {
    glass: 'glass-clear',
    straw: 'straw-wicker',
  }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['glass'], setting: ['medieval'] } } },

  // A glass pelican 340 mm tall for distilling a liquor round and round: a gourd body holding a green liquor, a
  // rounded head stoppered and luted at the top, and two arms that leave the head, run down either side and turn back
  // into the body, so what condenses in the head flows back to be boiled again.
  h.compound('pelican', 0.7, [
    h.turned('body', 'glass', 'y', [[0, 0], [0, 0.045], [0.01, 0.058], [0.04, 0.07], [0.08, 0.07], [0.12, 0.058], [0.15, 0.04], [0.17, 0.025], [0.2, 0.02], [0.215, 0.03], [0.235, 0.038], [0.26, 0.036], [0.28, 0.025], [0.29, 0.014], [0.33, 0.012], [0.335, 0.015], [0.34, 0.015], [0.34, 0]]),
    h.turned('liquor', 'liquor', 'y', [[0, 0], [0, 0.05], [0.03, 0.064], [0.05, 0.066], [0.05, 0]], [0, 0.004, 0]),
    ring('lute', 'lute', 0.012, 0.018, 0.325, 0.338),
    h.ball('stopper', 'glass', 0.012, 0, 0.348, 0),
  ] + std.flattenArrays([
    h.pipe('arm-%s' % side[0], 'glass', [[side[1] * 0.02, 0.24], [side[1] * 0.11, 0.215], [side[1] * 0.11, 0.12], [side[1] * 0.04, 0.07]], 0.008)
    for side in [['l', -1], ['r', 1]]
  ]), { glass: 'glass-clear', liquor: 'syrup-green', lute: 'clay-terracotta' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['glass'], setting: ['medieval'] } } },

  // An earthenware aludel for subliming, 520 mm tall: a round-bellied pot for the matter, three open pear-shaped pots
  // stacked on it, each fitted into the one below, and a domed cap with a vent knob, every joint luted with pale clay.
  h.compound('aludel', 2.3, [
    h.turned('pot', 'clay', 'y', [[0, 0], [0, 0.07], [0.03, 0.09], [0.08, 0.095], [0.12, 0.08], [0.14, 0.05], [0.15, 0.04], [0.15, 0]]),
  ] + [
    h.turned('pear-%d' % i, 'clay', 'y', [[0, 0], [0, 0.035], [0.015, 0.05], [0.04, 0.062], [0.065, 0.058], [0.09, 0.042], [0.105, 0.035], [0.11, 0.032], [0.11, 0]], [0, 0.14 + i * 0.1, 0])
    for i in [0, 1, 2]
  ] + [
    ring('lute-%d' % i, 'lute', 0.03, 0.043, 0.134 + i * 0.1, 0.148 + i * 0.1)
    for i in [0, 1, 2, 3]
  ] + [
    h.turned('cap', 'clay', 'y', [[0, 0], [0, 0.036], [0.02, 0.04], [0.045, 0.034], [0.065, 0.02], [0.075, 0.008], [0.08, 0]], [0, 0.44, 0]),
    h.disc('vent', 'clay', 0.01, 0.515, 0.525),
  ], { clay: 'clay-terracotta', lute: 'brick-buff' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['ceramic'], setting: ['medieval'] } } },

  // A philosopher's egg: an egg-shaped glass flask 110 mm across and 280 mm tall, its long neck drawn shut in the
  // flame, standing blunt end down in a straw ring with a black matter in the bottom.
  h.compound('philosophers_egg', 0.27, [
    h.turned('egg', 'glass', 'y', [[0, 0], [0.004, 0.025], [0.015, 0.042], [0.035, 0.053], [0.06, 0.055], [0.09, 0.05], [0.115, 0.04], [0.135, 0.027], [0.148, 0.014], [0.155, 0.009], [0.25, 0.007], [0.26, 0.004], [0.265, 0]], [0, 0.012, 0]),
    h.turned('matter', 'matter', 'y', [[0, 0], [0.004, 0.022], [0.012, 0.035], [0.025, 0.045], [0.025, 0]], [0, 0.016, 0]),
    ring('straw', 'straw', 0.028, 0.045, 0, 0.02),
  ], { glass: 'glass-clear', matter: 'coal-black', straw: 'straw-wicker' }) + h.inHand('philosophers_egg', 'egg') + { voxelGrain: 0.002 } + { taxonomy: { category: 'tools', tags: { material: ['glass'], setting: ['medieval'] } } },

  // A pear-shaped glass separating funnel 290 mm long lying on its side: a ground stopper in its neck, and a glass
  // stopcock with a flat key above the long stem, for drawing off the lower of two liquids that will not mix.
  h.compound('separating_funnel', 0.22, [
    h.turned('funnel', 'glass', 'x', [[0, 0], [0, 0.011], [0.018, 0.011], [0.026, 0.022], [0.045, 0.038], [0.07, 0.045], [0.095, 0.04], [0.125, 0.025], [0.155, 0.01], [0.17, 0.006], [0.17, 0]], [-0.11, 0.045, 0]),
    h.turned('stopper', 'glass', 'x', [[0, 0], [0, 0.016], [0.006, 0.016], [0.008, 0.009], [0.028, 0.01], [0.028, 0]], [-0.135, 0.045, 0]),
    h.turned('barrel', 'glass', 'z', [[0, 0], [0, 0.008], [0.04, 0.007], [0.04, 0]], [0.06, 0.045, -0.02]),
    box('key', 'glass', [0.054, 0.03, 0.02], [0.066, 0.06, 0.026]),
    h.turned('stem', 'glass', 'x', [[0, 0], [0, 0.0045], [0.095, 0.0035], [0.095, 0]], [0.06, 0.045, 0]),
  ], { glass: 'glass-clear' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'tools', tags: { material: ['glass'] } } },

  // Three slender glass phials 85 mm tall in a little oak block, each holding a different tincture under a cork
  // sealed with red wax.
  h.compound('sealed_phials', 0.12, [
    box('rack', 'rack', [-0.05, 0, -0.015], [0.05, 0.025, 0.015]),
  ] + std.flattenArrays([
    [
      h.turned('phial-%d' % i, 'glass', 'y', [[0, 0], [0, 0.008], [0.002, 0.009], [0.07, 0.009], [0.074, 0.007], [0.078, 0.0075], [0.078, 0]], [x, 0.006, 0]),
      h.turned('tincture-%d' % i, 'tincture-%d' % i, 'y', [[0, 0], [0, 0.0075], [0.05, 0.0075], [0.05, 0]], [x, 0.008, 0]),
      h.disc('cork-%d' % i, 'cork', 0.006, 0.08, 0.088, x),
      h.turned('wax-%d' % i, 'wax', 'y', [[0, 0], [0, 0.0085], [0.006, 0.0085], [0.011, 0.007], [0.013, 0]], [x, 0.078, 0]),
    ]
    for i in [0, 1, 2]
    for x in [[-0.03, 0, 0.03][i]]
  ]), {
    rack: 'wood-oak',
    glass: 'glass-clear',
    'tincture-0': 'resin-honey',
    'tincture-1': 'syrup-green',
    'tincture-2': 'syrup-orange',
    cork: 'cork',
    wax: 'lacquer-red',
  }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'containers', tags: { material: ['glass', 'wood'], setting: ['medieval'] } } },

  // A tin-glazed albarello, the waisted apothecary jar, 205 mm tall and 110 mm across: white glaze with cobalt bands
  // above and below a cream label band, its mouth tied over with a parchment cover and string.
  h.compound('apothecary_jar', 0.9, [
    h.turned('jar', 'glaze', 'y', [[0, 0], [0, 0.05], [0.012, 0.052], [0.02, 0.055], [0.05, 0.05], [0.1, 0.046], [0.15, 0.05], [0.175, 0.055], [0.185, 0.045], [0.195, 0.04], [0.2, 0.042], [0.2, 0]]),
    ring('band-low', 'blue', 0.045, 0.0545, 0.03, 0.042),
    ring('band-high', 'blue', 0.045, 0.0545, 0.155, 0.167),
    ring('label', 'label', 0.04, 0.0485, 0.08, 0.115),
    h.disc('cover', 'cover', 0.047, 0.2, 0.204),
    ring('cover-skirt', 'cover', 0.041, 0.045, 0.185, 0.204),
    ring('string', 'string', 0.044, 0.047, 0.19, 0.194),
  ], { glaze: 'ceramic-white', blue: 'paint-armour-blue', label: 'paper-pages-cream', cover: 'paper-butcher', string: 'cord-cotton' }) + h.inHand('apothecary_jar', 'jar') + { voxelGrain: 0.004 } + { taxonomy: { category: 'containers', tags: { material: ['ceramic'], setting: ['medieval'] } } },

  // A round glass flask 180 mm across and 320 mm tall to the cork, its belly caged in woven wicker with a loop
  // handle at the shoulder.
  h.compound('wicker_flask', 0.75, [
    bulb('flask', 'glass', 0.09, 0.095, 0.018, 0.3),
    h.disc('cork', 'cork', 0.016, 0.295, 0.32),
    h.turned('cage', 'wicker', 'y', [[0, 0], [0, 0.06], [0.015, 0.08], [0.05, 0.093], [0.1, 0.093], [0.14, 0.078], [0.165, 0.06], [0.165, 0]]),
    ring('rim', 'weave', 0.05, 0.066, 0.155, 0.168),
    h.turned('handle', 'weave', 'z', [[0, 0.03], [0, 0.037], [0.012, 0.037], [0.012, 0.03], [0, 0.03]], [0.09, 0.15, -0.006]),
  ] + [
    ring('weave-%d' % i, 'weave', b[1] - 0.01, b[1] + 0.002, b[0], b[0] + 0.008)
    for i in [0, 1, 2, 3]
    for b in [[[0.03, 0.087], [0.065, 0.093], [0.1, 0.093], [0.135, 0.079]][i]]
  ], { glass: 'glass-clear', cork: 'cork', wicker: 'straw-wicker', weave: 'straw-pale' }) + h.inHand('wicker_flask', 'cage') + { voxelGrain: 0.004 } + { taxonomy: { category: 'containers', tags: { material: ['glass', 'plant'], setting: ['medieval'] } } },

  // A brick athanor 1.45 m tall: a round iron-hooped furnace 600 mm across on a plinth, with a fire door and an ash
  // door glowing below it, a tall fuel tower on top under a domed lid that feeds charcoal down as it burns, and a
  // side oven carrying a sand pan where a glass egg sits in the steady heat.
  h.compound('athanor', 320, [
    box('plinth', 'brick', [-0.36, 0, -0.36], [0.36, 0.08, 0.36]),
    h.disc('furnace', 'brick', 0.3, 0.08, 0.75),
    h.turned('shoulder', 'brick', 'y', [[0, 0], [0, 0.3], [0.06, 0.26], [0.1, 0.2], [0.12, 0.16], [0.12, 0]], [0, 0.75, 0]),
    h.disc('tower', 'brick', 0.16, 0.85, 1.35),
    h.turned('lid', 'iron', 'y', [[0, 0], [0, 0.18], [0.02, 0.18], [0.05, 0.08], [0.07, 0.03], [0.07, 0]], [0, 1.35, 0]),
    h.ball('lid-knob', 'iron', 0.02, 0, 1.43, 0),
    box('fire-door', 'iron', [-0.11, 0.3, 0.27], [0.11, 0.48, 0.31]),
    box('fire-latch', 'iron', [0.06, 0.38, 0.31], [0.1, 0.395, 0.325]),
    box('ash-door', 'iron', [-0.09, 0.1, 0.27], [0.09, 0.2, 0.31]),
    box('ash-glow', 'ember', [-0.075, 0.12, 0.3], [0.075, 0.135, 0.315]),
    // The side oven and its sand pan, with the egg's neck standing out of the sand.
    box('oven', 'brick', [0.25, 0.08, -0.2], [0.65, 0.5, 0.2]),
    h.disc('pan', 'iron', 0.15, 0.5, 0.56, 0.45, 0),
    h.disc('sand', 'sand', 0.14, 0.56, 0.565, 0.45, 0),
    h.turned('egg', 'glass', 'y', [[0, 0], [0, 0.04], [0.03, 0.035], [0.05, 0.015], [0.06, 0.008], [0.15, 0.006], [0.155, 0]], [0.45, 0.52, 0]),
  ] + [
    ring('hoop-%d' % i, 'iron', 0.29, 0.312, y, y + 0.025)
    for i in [0, 1, 2]
    for y in [[0.2, 0.45, 0.7][i]]
  ] + [
    ring('tower-hoop-%d' % i, 'iron', 0.15, 0.17, y, y + 0.02)
    for i in [0, 1]
    for y in [[1.0, 1.22][i]]
  ], { brick: 'brick-buff', iron: 'iron-dull', ember: 'glow-flame', sand: 'brick-buff', glass: 'glass-clear' }) + { voxelGrain: 0.008 } + { taxonomy: { category: 'machinery', tags: { material: ['ceramic', 'metal'], setting: ['medieval'] } } },

  // A sand bath: a wrought iron pan 300 mm across on three stub feet, filled with sand, a round glass flask buried to
  // its middle so it heats evenly.
  h.compound('sand_bath', 10, [
    vessel('pan', 'iron', [[0, 0.15], [0.08, 0.15]], 0.004, [0, 0.03, 0]),
    h.disc('sand', 'sand', 0.146, 0.034, 0.095),
    bulb('flask', 'glass', 0.06, 0.1, 0.014, 0.24),
    box('lug-l', 'iron', [-0.175, 0.09, -0.02], [-0.15, 0.105, 0.02]),
    box('lug-r', 'iron', [0.15, 0.09, -0.02], [0.175, 0.105, 0.02]),
  ] + [
    local a = 2 * std.pi * i / 3;
    h.disc('foot-%d' % i, 'iron', 0.012, 0, 0.03, 0.1 * std.sin(a), 0.1 * std.cos(a))
    for i in [0, 1, 2]
  ], { iron: 'iron-dull', sand: 'brick-buff', glass: 'glass-clear' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['metal', 'stone'], setting: ['medieval'] } } },

  // A water bath, the bain-marie: a copper pan 300 mm across and 180 mm deep with a rolled rim and two ring handles,
  // nearly full of water, a round glass flask standing in it to be warmed gently.
  h.compound('water_bath', 12, [
    vessel('pan', 'copper', [[0, 0.14], [0.015, 0.15], [0.18, 0.15]], 0.002),
    ring('rim', 'copper', 0.146, 0.155, 0.175, 0.183),
    h.turned('water', 'water', 'y', [[0, 0], [0, 0.137], [0.013, 0.147], [0.138, 0.147], [0.138, 0]], [0, 0.002, 0]),
    bulb('flask', 'glass', 0.06, 0.062, 0.018, 0.26),
    h.turned('handle-l', 'copper', 'z', [[0, 0.012], [0, 0.018], [0.006, 0.018], [0.006, 0.012], [0, 0.012]], [-0.165, 0.15, -0.003]),
    h.turned('handle-r', 'copper', 'z', [[0, 0.012], [0, 0.018], [0.006, 0.018], [0.006, 0.012], [0, 0.012]], [0.165, 0.15, -0.003]),
  ], { copper: 'copper', water: 'water', glass: 'glass-clear' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['metal'], setting: ['medieval'] } } },

  // A bone-ash cupel 35 mm across and 19 mm tall for assaying, its shallow dish holding the silver bead left when the
  // lead has soaked away.
  h.compound('cupel', 0.02, [
    h.turned('cupel', 'ash', 'y', [[0, 0], [0, 0.015], [0.019, 0.0175], [0.019, 0.012], [0.015, 0.006], [0.013, 0]]),
    h.ball('bead', 'silver', 0.003, 0, 0.0155, 0),
  ], { ash: 'bone', silver: 'metal-silver' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'tools', tags: { material: ['bone'], setting: ['medieval'] } } },

  // An iron spatula 190 mm long lying flat: a round shank, a thin flat blade at one end and a small round scoop at
  // the other for taking up powders.
  h.compound('spatula', 0.07, [
    h.turned('shank', 'iron', 'x', [[0, 0], [0, 0.0045], [0.1, 0.0035], [0.1, 0]], [-0.08, 0.0045, 0]),
    box('neck', 'iron', [0.015, 0, -0.004], [0.026, 0.006, 0.004]),
    box('blade', 'iron', [0.02, 0, -0.008], [0.09, 0.0015, 0.008]),
    h.disc('scoop', 'iron', 0.009, 0, 0.004, -0.09, 0),
  ], { iron: 'iron-dull' }) + { handling: h.gripOn('spatula', 'shank'), voxelGrain: 0.002 } + { taxonomy: { category: 'tools', tags: { material: ['metal'], setting: ['medieval'] } } },

  // A wrought iron casting ladle 580 mm long: a deep bowl 110 mm across with a pouring lip, and a long iron handle
  // ending in a turned wooden grip.
  h.compound('iron_ladle', 1.5, [
    vessel('bowl', 'iron', [[0, 0.035], [0.02, 0.05], [0.055, 0.055]], 0.005),
    h.prism('lip', 'iron', 'y', [[-0.014, 0.05], [0.014, 0.05], [0.006, 0.068], [-0.006, 0.068]], 0.045, 0.055),
    h.rod('handle', 'iron', 0.006, -0.42, -0.05, 0.05),
    h.turned('grip', 'grip', 'x', [[0, 0], [0, 0.012], [0.005, 0.014], [0.11, 0.014], [0.12, 0.011], [0.12, 0]], [-0.53, 0.05, 0]),
  ], { iron: 'iron-dull', grip: 'wood-walnut' }) + { handling: h.gripOn('iron_ladle', 'grip'), voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['metal'], setting: ['medieval'] } } },

  // A forged iron tripod 220 mm across and 190 mm tall: a flat-bar ring on three straight legs with flattened feet,
  // for standing a vessel over a fire or brazier.
  h.compound('iron_tripod', 1.6, [
    ring('ring', 'iron', 0.095, 0.11, 0.178, 0.19),
  ] + std.flattenArrays([
    local a = 2 * std.pi * i / 3, x = 0.1025 * std.sin(a), z = 0.1025 * std.cos(a);
    [
      h.disc('leg-%d' % i, 'iron', 0.007, 0.004, 0.18, x, z),
      h.disc('foot-%d' % i, 'iron', 0.012, 0, 0.005, x, z),
    ]
    for i in [0, 1, 2]
  ]), { iron: 'iron-dull' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['metal'], setting: ['medieval'] } } },

  // An hourglass 200 mm tall: two blown glass bulbs joined at a narrow waist between turned walnut end plates on
  // three posts, most of the sand run through into the lower bulb and a thread of it still falling.
  h.compound('hourglass', 0.45, [
    h.disc('base', 'wood', 0.05, 0, 0.015),
    h.disc('top', 'wood', 0.05, 0.185, 0.2),
    h.turned('glass', 'glass', 'y', [[0, 0], [0, 0.026], [0.02, 0.036], [0.05, 0.034], [0.075, 0.016], [0.085, 0.004], [0.095, 0.016], [0.12, 0.034], [0.15, 0.036], [0.17, 0.026], [0.17, 0]], [0, 0.015, 0]),
    h.turned('sand-low', 'sand', 'y', [[0, 0], [0, 0.027], [0.015, 0.033], [0.03, 0.012], [0.035, 0]], [0, 0.017, 0]),
    h.turned('sand-high', 'sand', 'y', [[0, 0], [0, 0.003], [0.01, 0.015], [0.03, 0.028], [0.03, 0]], [0, 0.1, 0]),
    h.disc('thread', 'sand', 0.001, 0.05, 0.1),
  ] + [
    local a = 2 * std.pi * i / 3;
    h.disc('post-%d' % i, 'wood', 0.005, 0.015, 0.185, 0.042 * std.sin(a), 0.042 * std.cos(a))
    for i in [0, 1, 2]
  ], { wood: 'wood-walnut', glass: 'glass-clear', sand: 'brick-buff' }) + h.inHand('hourglass', 'glass') + { voxelGrain: 0.002 } + { taxonomy: { category: 'tools', tags: { material: ['glass', 'wood'], setting: ['medieval'] } } },

  // A grimoire lying shut, 280 by 210 mm and 70 mm thick: a thick page block in oxblood leather over boards, a
  // raised-band spine, brass corners, a brass roundel on the cover and two brass clasps holding it closed.
  h.compound('grimoire', 2.8, [
    box('board-low', 'leather', [-0.1, 0, -0.14], [0.1, 0.006, 0.14]),
    box('board-high', 'leather', [-0.1, 0.064, -0.14], [0.1, 0.07, 0.14]),
    box('pages', 'pages', [-0.095, 0.006, -0.135], [0.098, 0.064, 0.135]),
    box('spine', 'leather', [-0.106, 0, -0.14], [-0.095, 0.07, 0.14]),
    ring('roundel', 'brass', 0.026, 0.034, 0.07, 0.073),
    h.disc('boss', 'brass', 0.01, 0.07, 0.075),
  ] + [
    box('band-%d' % i, 'leather', [-0.11, 0.003, -0.105 + i * 0.07 - 0.005], [-0.105, 0.067, -0.105 + i * 0.07 + 0.005])
    for i in [0, 1, 2, 3]
  ] + [
    box('corner-%d' % i, 'brass', [c[0] - 0.02, 0.07, c[1] - 0.02], [c[0] + 0.02, 0.0725, c[1] + 0.02])
    for i in [0, 1, 2, 3]
    for c in [[[-0.082, -0.122], [0.082, -0.122], [-0.082, 0.122], [0.082, 0.122]][i]]
  ] + std.flattenArrays([
    [
      box('strap-%d' % i, 'leather', [0.07, 0.07, z - 0.011], [0.1, 0.0725, z + 0.011]),
      box('clasp-%d' % i, 'brass', [0.098, 0.012, z - 0.012], [0.104, 0.074, z + 0.012]),
    ]
    for i in [0, 1]
    for z in [[-0.07, 0.07][i]]
  ]), { leather: 'leather-oxblood', pages: 'paper-pages-cream', brass: 'brass-dull' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'arcana', tags: { material: ['leather', 'paper'], setting: ['medieval'] } } },

  // A touchstone: a slab of fine black stone 80 by 50 by 12 mm, its top streaked with gold where pieces were rubbed
  // on it to judge their fineness by the colour of the mark.
  h.compound('touchstone', 0.13, [
    box('stone', 'stone', [-0.04, 0, -0.025], [0.04, 0.012, 0.025]),
  ] + [
    box('streak-%d' % i, 'gold', [-0.03 + i * 0.012, 0.012, -0.016 + (i % 2) * 0.004], [-0.026 + i * 0.012, 0.0135, 0.014 - (i % 2) * 0.006])
    for i in [0, 1, 2, 3, 4]
  ], { stone: 'gem-onyx', gold: 'metal-gold' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'tools', tags: { material: ['stone'], setting: ['medieval'] } } },

  // A brass astrolabe 160 mm across lying face up: the mater with its raised limb, a plate inside it, the open rete
  // over the plate with its off-centre ecliptic ring, a sighting rule pinned at the centre, and the throne and
  // shackle ring it hangs by.
  h.compound('astrolabe', 1.2, [
    // A cast and engraved disc reads true round, not faceted.
    h.disc('mater', 'brass', 0.08, 0, 0.006) + round,
    ring('limb', 'brass', 0.068, 0.08, 0.006, 0.01) + round,
    h.disc('plate', 'plate', 0.068, 0.006, 0.007) + round,
    ring('rete', 'brass', 0.058, 0.064, 0.007, 0.009) + round,
    ring('ecliptic', 'brass', 0.034, 0.039, 0.007, 0.009, 0, 0.018) + round,
    box('rete-bar-x', 'brass', [-0.06, 0.007, -0.002], [0.06, 0.009, 0.002]),
    box('rete-bar-z', 'brass', [-0.002, 0.007, -0.06], [0.002, 0.009, 0.06]),
    barY('rule', 'brass', [-0.064, -0.037], [0.064, 0.037], 0.012, 0.009, 0.0115),
    h.disc('pin', 'brass', 0.004, 0, 0.015),
    h.prism('throne', 'brass', 'y', [[0.075, -0.02], [0.075, 0.02], [0.095, 0.01], [0.095, -0.01]], 0, 0.008),
    ring('shackle', 'brass', 0.008, 0.012, 0.002, 0.006, 0, 0.103),
  ], { brass: 'brass', plate: 'brass-dull' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'tools', tags: { material: ['metal'], setting: ['medieval'] } } },

  // A distilling worm 610 mm tall: an oak tub 420 mm across, iron-hooped and full of cold water, holding a copper
  // coil of five turns. The vapour comes in at the top from the still and runs down through the coil, and the
  // distillate leaves by a spout at the foot.
  h.compound('distilling_worm', 66, [
    vessel('tub', 'wood', [[0, 0.2], [0.5, 0.21]], 0.02),
    h.disc('water', 'water', 0.188, 0.02, 0.47),
  ] + [
    ring('hoop-%d' % i, 'iron', 0.198, 0.218, y, y + 0.025)
    for i in [0, 1, 2]
    for y in [[0.06, 0.25, 0.44][i]]
  ] + [
    turn('turn-%d' % i, 'copper', 0.12, 0.01, 0.06 + i * 0.075)
    for i in [0, 1, 2, 3, 4]
  ]
  // The turns are separate rings, so a rod from the bottom turn to the top one holds them as one coil.
  + h.bend('coil-rod', 'copper', [[-0.12 * std.cos(std.pi / 8), 0.07], [0.12 * std.cos(std.pi / 8), 0.37]], 0.02, -0.01, 0.01)
  + [
    h.disc('inlet', 'copper', 0.012, 0.37, 0.6, -0.12, 0),
    h.ball('inlet-bend', 'copper', 0.012, -0.12, 0.6, 0),
    h.rod('inlet-arm', 'copper', 0.012, -0.3, -0.12, 0.6),
    h.rod('outlet', 'copper', 0.01, 0.12, 0.3, 0.07),
    h.disc('spout', 'copper', 0.01, 0.03, 0.07, 0.29, 0),
    box('tap', 'brass', [0.255, 0.06, -0.012], [0.275, 0.085, 0.012]),
  ], { wood: 'wood-oak', water: 'water', iron: 'iron-dull', copper: 'copper', brass: 'brass' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'tools', tags: { material: ['metal', 'wood'], setting: ['medieval'] } } },
]
