// The heavy blue armour set: the trooper's fitted worn shells in a cobalt livery, with over-the-top pieces added per
// slot: huge round pauldrons, a broad chest plate over a dark belt, bulky cuisses, greaves and vambraces, oversized
// gauntlets and a chunky helm. Worn shells only (no ground models).
local armour = import 'armour.libsonnet';
local fit = import '../tools/packages/thing-authoring-tool/worn-fit.libsonnet';
local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bust = import 'measures/bust.libsonnet';
local arm = import 'measures/arm.libsonnet';
local leg = import 'measures/leg.libsonnet';
local oct = fit.oct;
local g = fit.layers.cloak;

// Cobalt paint over navy fittings and belt, pale blue edging and dark gunmetal rivets.
local livery = { plate: 'paint-armour-blue', trim: 'paint-armour-navy', strap: 'paint-armour-navy', rivet: 'steel-parkerized', insignia: 'paint-armour-sky' };
local gauntlet = livery + { hand: 'leather-black' };
local bootFinish = { upper: 'paint-armour-navy', toe: 'paint-armour-blue', sole: 'rubber-tread', collar: 'paint-armour-sky', laces: 'webbing-olive-dark' };

// A fitted row with its pieces filtered and added to: drops the pieces `drop` names, appends `add`.
local remake(row, drop, add, grain=0.004) =
  local pieces = std.parseJson(row.parts[0].params.pieces);
  h.compound(row.id, 0.1, [p for p in pieces if !drop(p.id)] + add, row.parts[0].finish) + { voxelGrain: grain, title: row.title };
local starts(prefixes) = function(id) std.length([1 for p in prefixes if std.startsWith(id, p)]) > 0;
local round(piece) = piece + { sides: 16 };
local find(row, id) = [p for p in std.parseJson(row.parts[0].params.pieces) if p.id == id][0];

// Body: a wide chest plate with a small panel, over wide navy belt and buckle. Heights from the bust measures.
local waistTop = bust.pelvisHeight + bust.waistHeight;
local ribTop = waistTop + bust.ribHeight;
local chestTop = ribTop + bust.chestHeight;
local beltY = waistTop - 0.1;
local lowW = bust.pelvisWidth + 2 * g, lowD = bust.pelvisDepth + 2 * g;
local chestDepth = 0.31;
local bodyAdd = [
  oct('chest', 'plate', ribTop - 0.04, chestTop + 0.005, 0.5, chestDepth, 0.1),
  h.prism('slab', 'plate', 'z', [[-0.21, ribTop - 0.03], [0.21, ribTop - 0.03], [0.24, chestTop - 0.02], [-0.24, chestTop - 0.02]],
          chestDepth / 2 - 0.006, chestDepth / 2 + 0.03),
  h.box('panel-frame', 'trim', [-0.065, ribTop + 0.025, chestDepth / 2 + 0.03], [0.065, ribTop + 0.105, chestDepth / 2 + 0.036]),
  h.box('panel', 'insignia', [-0.045, ribTop + 0.04, chestDepth / 2 + 0.036], [0.045, ribTop + 0.09, chestDepth / 2 + 0.042]),
  oct('belt', 'strap', beltY, beltY + 0.085, lowW + 0.06, lowD + 0.06, bust.torsoChamfer / 2),
  h.box('buckle', 'insignia', [-0.055, beltY + 0.01, (lowD + 0.06) / 2], [0.055, beltY + 0.075, (lowD + 0.06) / 2 + 0.014]),
] + [
  h.box('rivet-%d-%d' % [i, k], 'rivet', [[-0.2, 0.17][k], ribTop - 0.01 + i * 0.1, chestDepth / 2 + 0.03], [[-0.17, 0.2][k], ribTop + 0.02 + i * 0.1, chestDepth / 2 + 0.036])
  for i in [0, 1]
  for k in [0, 1]
];

// Upper arm: a round pauldron turned about the shoulder, its rim and two lames under it, a fat arm guard.
local uw = arm.upperWidth + 2 * g, ud = arm.upperDepth + 2 * g;
// The pauldron pieces are scaled together about the shoulder joint by `pauldronScale` (1.25: a quarter bigger).
local pauldronScale = 1.25;
local ps = pauldronScale;
local upperAdd = [
  round(h.dome('pauldron', 'plate', 0.19 * ps, 0.12 * ps, 0.028 * ps, 'y', [0, -0.03 * ps, 0])),
  round(h.disc('pauldron-rim', 'insignia', 0.198 * ps, -0.05 * ps, -0.025 * ps)),
  round(h.disc('pauldron-lame-1', 'plate', 0.17 * ps, -0.09 * ps, -0.045 * ps)),
  round(h.disc('pauldron-lame-2', 'trim', 0.14 * ps, -0.125 * ps, -0.085 * ps)),
  h.box('comb', 'trim', [-0.012 * ps, 0.08 * ps, -0.12 * ps], [0.012 * ps, 0.108 * ps, 0.12 * ps]),
  oct('rerebrace', 'plate', -arm.upperLength - arm.seamOverlap, -0.14, uw + 0.05, ud + 0.05, 0.03),
];

// Forearm: a big elbow cop and a thick ribbed vambrace.
local fw = arm.foreWidth + 2 * g, fd = arm.upperDepth + 2 * g;
local foreAdd = [
  oct('couter', 'plate', -0.065, 0.06, fw + 0.06, fd + 0.06, 0.04),
  round(h.turned('couter-boss', 'trim', 'z', [[0, 0], [0, 0.045], [0.012, 0.036], [0.022, 0]], [0, 0, -(fd + 0.06) / 2 - 0.006])),
  oct('vambrace', 'plate', -arm.foreLength + 0.012, -0.06, fw + 0.05, fd + 0.05, 0.03),
] + [
  oct('vambrace-rib-%d' % i, 'trim', -0.1 - i * 0.05, -0.086 - i * 0.05, fw + 0.062, fd + 0.062, 0.03)
  for i in [0, 1, 2]
];

// Gauntlet: a flared cuff (from `hands`), plus a plate over the back of the hand.
local palmX = arm.palmThickness / 2 + fit.layers.normal, palmZ = arm.palmWidth / 2 + fit.layers.normal;
local palmAdd = [
  h.box('back-plate', 'plate', [-palmX - 0.03, -arm.palmLength + 0.005, -palmZ - 0.012], [-palmX, -0.012, palmZ + 0.012]),
  h.box('knuckle-bar', 'trim', [-palmX - 0.04, -arm.palmLength - 0.01, -palmZ - 0.016], [-palmX - 0.02, -arm.palmLength + 0.02, palmZ + 0.016]),
];

// Thigh: a thick cuisse with a big front plate. Bulk goes front and back, as the legs stand close together.
local tw = leg.thighWidth + 2 * g, td = leg.thighDepth + 2 * g;
local thighAdd = [
  oct('cuisse', 'plate', -leg.thighLength + 0.02, -0.04, tw + 0.045, td + 0.07, leg.thighChamfer / 2 + 0.03),
  h.box('cuisse-plate', 'plate', [-tw * 0.45, -leg.thighLength + 0.06, (td + 0.07) / 2 - 0.004], [tw * 0.45, -0.075, (td + 0.07) / 2 + 0.02]),
  oct('cuisse-rim', 'insignia', -0.07, -0.04, tw + 0.055, td + 0.08, leg.thighChamfer / 2 + 0.03),
] + [
  oct('strap-%d' % i, 'strap', y, y + 0.03, tw + 0.055, td + 0.08, leg.thighChamfer / 2 + 0.03)
  for i in [0, 1]
  for y in [[-0.18, -0.32][i]]
];

// Shin: a big knee cop over a bulky greave.
local shinLength = leg.length - leg.thighLength - leg.shoeHeight;
local sw = leg.shinWidth + 2 * g, sd = leg.shinDepth + 2 * g;
local kneeD = sd + 0.06;
local shinAdd = [
  oct('knee', 'plate', -0.08, 0.075, sw + 0.075, kneeD, 0.035),
  h.box('knee-guard', 'plate', [-0.07, -0.085, kneeD / 2 - 0.004], [0.07, 0.09, kneeD / 2 + 0.024]),
  round(h.dome('knee-cop', 'trim', 0.045, 0.024, 0.008, 'z', [0, 0, kneeD / 2 + 0.024])),
  oct('greave', 'plate', -shinLength - leg.ankleOverlap, -0.065, sw + 0.05, sd + 0.05, leg.shinChamfer / 2 + 0.02),
  h.prism('greave-ridge', 'trim', 'y', [[(sd + 0.05) / 2 - 0.002, -0.02], [(sd + 0.05) / 2 + 0.018, 0], [(sd + 0.05) / 2 - 0.002, 0.02]],
          -shinLength + 0.03, -0.1),
  oct('greave-rim', 'insignia', -shinLength - leg.ankleOverlap, -shinLength + 0.012, sw + 0.06, sd + 0.06, leg.shinChamfer / 2 + 0.02),
];

// The helm: wider and deeper than the trooper's, with cheek guards, ear discs, a tall crest and a heavy brow.
local helmet = [
  h.box('skirt', 'trim', [-0.16, 0, -0.17], [0.16, 0.04, 0.17]),
  h.box('shell', 'plate', [-0.145, 0.035, -0.155], [0.145, 0.27, 0.155]),
  h.box('cap', 'plate', [-0.135, 0.265, -0.145], [0.135, 0.29, 0.145]),
  round(h.dome('crown', 'plate', 0.135, 0.075, 0.014, 'y', [0, 0.285, 0])),
  h.box('crest', 'insignia', [-0.016, 0.29, -0.14], [0.016, 0.375, 0.14]),
  h.box('brow', 'trim', [-0.15, 0.19, 0.14], [0.15, 0.222, 0.18]),
  h.box('visor', 'lens', [-0.115, 0.155, 0.145], [0.115, 0.19, 0.162]),
  h.prism('faceplate', 'plate', 'x', [[0.04, 0.15], [0.17, 0.15], [0.145, 0.19], [0.06, 0.196]], -0.085, 0.085),
] + [
  h.box('grille-%d' % i, 'grille', [-0.055, 0.07 + i * 0.022, 0.185], [0.055, 0.081 + i * 0.022, 0.2])
  for i in [0, 1, 2]
] + [
  h.box('cheek-%d' % i, 'plate', [[-0.172, 0.145][i], 0.05, -0.04], [[-0.145, 0.172][i], 0.2, 0.14])
  for i in [0, 1]
] + [
  round(h.rod('ear-%d' % i, 'trim', 0.055, [-0.2, 0.17][i], [-0.17, 0.2][i], 0.13))
  for i in [0, 1]
] + [
  h.box('bolt-%d' % i, 'rivet', [[-0.175, 0.145][i], 0.06, 0.1], [[-0.145, 0.175][i], 0.085, 0.12])
  for i in [0, 1]
] + [
  round(h.rod('filter', 'trim', 0.03, 0.2, 0.26, 0.08)) + { origin: [-0.235, 0.08, 0.09] },
];

local body = fit.trooper('armor_heavy', livery, title='Heavy body armour').rows;
local legs = fit.trooperLegs('legguard_heavy', livery, title='Heavy leg guards').rows;
local gloves = fit.hands('gloves_heavy', gauntlet, {
  layer: 'normal', cuff: 0.13, flare: 0.07, hem: 0.02, backRidges: 0,
  slots: { hand: 'hand', cuff: 'plate', hem: 'insignia', ridge: 'rivet' },
}, 'Heavy gauntlets').rows;
local boots = fit.feet('boots_heavy', bootFinish,
                       { l: 0.34, w: 0.15, s: 0.045, toe: 0.13, instep: 0.155, top: 0.325, shaft: 0.15, laces: 0 }, title='Heavy boots').rows;
local shaftGuard(row) =
  local shaft = find(row, 'shaft');
  oct('shaft-guard', 'toe', shaft.start + 0.015, shaft.end - 0.01, 0.185, 0.175, 0.03);

local forArmour = {
  body: function(r) remake(r, starts(['chest', 'slab', 'chevron', 'rivet', 'belt', 'buckle']), bodyAdd),
  upper: function(r) remake(r, starts(['pauldron', 'comb', 'rerebrace']), upperAdd, 0.012),  // a coarser voxel grain (a multiple of 0.002) as the pauldron grew, so the triangle count holds
  fore: function(r) remake(r, starts(['couter', 'vambrace']), foreAdd),
  palm: function(r) remake(r, starts([]), palmAdd),
  thigh: function(r) remake(r, starts(['cuisse', 'strap']), thighAdd),
  shin: function(r) remake(r, starts(['knee', 'greave']), shinAdd),
  shaft: function(r) remake(r, starts([]), [shaftGuard(r)]),
};
armour.of(null, [
  local seg = std.split(r.id, '_worn_')[1];
  if std.objectHas(forArmour, seg) then forArmour[seg](r) else r
  for r in body + gloves + legs + boots
] + [
  h.compound('helmet_heavy', 3.2, helmet, livery + { lens: 'glass-lens-amber', grille: 'rubber-black' }) + { title: 'Heavy helmet' } + { voxelGrain: 0.006 },
])
