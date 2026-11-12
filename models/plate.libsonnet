// The medieval plate set: a bright steel harness in the fitted worn frames of the trooper and heavy looks. A breastplate
// over a plackart with a keel, three fauld lames and tassets, a lamed gorget, rounded pauldrons with stepped lames,
// rerebraces, couters with a wing, vambraces, steel gauntlets, cuisses, poleyns, greaves, pointed sabatons and an armet
// with a pointed visor. Worn shells only.
local armour = import 'armour.libsonnet';
local fit = import '../tools/packages/thing-authoring-tool/worn-fit.libsonnet';
local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bust = import 'measures/bust.libsonnet';
local arm = import 'measures/arm.libsonnet';
local leg = import 'measures/leg.libsonnet';
local oct = fit.oct;
local g = fit.layers.over;

// Hardened steel plate, bright rims and bosses, black leather straps, brass rivets.
local livery = { plate: 'steel-plate', trim: 'steel-bright', strap: 'leather-black', rivet: 'brass-polished', insignia: 'steel-bright' };
local gauntlet = livery + { hand: 'steel-plate' };
local sabaton = { upper: 'steel-plate', toe: 'steel-bright', sole: 'leather-black', collar: 'steel-bright', laces: 'leather-black' };

local round(piece) = piece + { sides: 16 };
local row(id, pieces, grain=0.004) = h.compound(id, 0.1, pieces, livery) + { voxelGrain: grain };
// A fitted row with `add` appended to its pieces.
local extend(r, add, grain=0.004) =
  h.compound(r.id, 0.1, std.parseJson(r.parts[0].params.pieces) + add, r.parts[0].finish) + { voxelGrain: grain };

// Body: breastplate with a keel over a plackart, three fauld lames, a pair of tassets in front, a gorget of two lames.
local waistTop = bust.pelvisHeight + bust.waistHeight;
local ribTop = waistTop + bust.ribHeight;
local chestTop = ribTop + bust.chestHeight;
local cut = bust.torsoChamfer / 2;
local chestW = bust.chestWidth + 2 * g + 0.03, chestD = bust.chestDepth + 2 * g + 0.045;
local lowW = bust.pelvisWidth + 2 * g, lowD = bust.pelvisDepth + 2 * g;
local skirtTop = waistTop - 0.04;
local shoulderX = bust.chestWidth / 2 + bust.shoulderWidth / 2 + 0.03 + g;
local body = [
  oct('plackart', 'plate', skirtTop, ribTop + 0.01, bust.waistWidth + 2 * g + 0.02, bust.ribDepth + 2 * g + 0.03, cut),
  oct('plackart-rim', 'trim', skirtTop, skirtTop + 0.012, bust.waistWidth + 2 * g + 0.03, bust.ribDepth + 2 * g + 0.04, cut),
  oct('breast', 'plate', ribTop - 0.04, chestTop, chestW, chestD, 0.07),
  oct('breast-rim', 'trim', ribTop - 0.04, ribTop - 0.026, chestW + 0.01, chestD + 0.01, 0.07),
  // The keel: a ridge down the breast's front, turning the lance aside.
  h.prism('keel', 'trim', 'y', [[chestD / 2 - 0.004, -0.035], [chestD / 2 + 0.03, 0], [chestD / 2 - 0.004, 0.035]], ribTop - 0.03, chestTop - 0.02),
  oct('yoke', 'plate', chestTop - 0.1, chestTop + 0.015, 2 * shoulderX - 0.02, bust.shoulderDepth + 2 * g + 0.02, 0.045),
  // Arm-hole edges: a rim round each shoulder so the pauldron meets plate.
  oct('gorget-1', 'plate', chestTop - 0.01, chestTop + 0.04, bust.neckWidth + 0.09, bust.neckWidth + 0.09, 0.03, cz=-0.01),
  oct('gorget-2', 'plate', chestTop + 0.025, chestTop + 0.075, bust.neckWidth + 0.075, bust.neckWidth + 0.075, 0.028, cz=-0.01),
  oct('gorget-lip', 'trim', chestTop + 0.07, chestTop + 0.085, bust.neckWidth + 0.085, bust.neckWidth + 0.085, 0.028, cz=-0.01),
] + [
  // Fauld lames, each wider than the last and overlapping the one above.
  oct('fauld-%d' % i, 'plate', skirtTop - (i + 1) * 0.055 + 0.005, skirtTop - i * 0.055 + 0.012, lowW + 0.014 * (i + 1), lowD + 0.014 * (i + 1), cut)
  for i in [0, 1, 2]
] + [
  oct('fauld-rim', 'trim', skirtTop - 0.165, skirtTop - 0.15, lowW + 0.056, lowD + 0.056, cut),
] + [
  // Tassets hang over the front of each thigh, flared outward, short enough to clear the walking leg.
  h.box('tasset-%d-%d' % [k, i], 'plate', [[-0.16, 0.02][k] - 0.012 * i, skirtTop - 0.165 - 0.045 * (i + 1) + 0.01, lowD / 2 + 0.03 - 0.004 * i],
        [[-0.02, 0.16][k] + 0.012 * i, skirtTop - 0.165 - 0.045 * i + 0.01, lowD / 2 + 0.03 + 0.012 - 0.004 * i])
  for k in [0, 1]
  for i in [0, 1]
] + [
  // Straps and rivets: shoulder straps over the yoke, buckles on the breast's edge.
  h.box('strap-%d' % k, 'strap', [[-0.13, 0.11][k], chestTop + 0.012, -bust.shoulderDepth / 2 - g], [[-0.11, 0.13][k], chestTop + 0.02, bust.shoulderDepth / 2 + g])
  for k in [0, 1]
] + [
  h.box('rivet-%d' % k, 'rivet', [[-0.19, 0.178][k], ribTop + 0.06, chestD / 2 - 0.03], [[-0.178, 0.19][k], ribTop + 0.075, chestD / 2 - 0.018])
  for k in [0, 1]
];

// Upper arm: a rounded pauldron turned about the shoulder with three lames stepping down, and a rerebrace.
local uw = arm.upperWidth + 2 * g, ud = arm.upperDepth + 2 * g;
local upper = [
  round(h.dome('pauldron', 'plate', 0.165, 0.095, 0.022, 'y', [0, -0.03, 0])),
  round(h.disc('pauldron-rim', 'trim', 0.17, -0.045, -0.03)),
  round(h.disc('pauldron-lame-1', 'plate', 0.152, -0.085, -0.04)),
  round(h.disc('pauldron-lame-2', 'plate', 0.136, -0.12, -0.08)),
  round(h.disc('pauldron-lame-3', 'plate', 0.12, -0.155, -0.115)),
  oct('rerebrace', 'plate', -arm.upperLength - arm.seamOverlap, -0.17, uw + 0.03, ud + 0.03, 0.025),
  oct('rerebrace-rim', 'trim', -0.185, -0.17, uw + 0.04, ud + 0.04, 0.025),
  oct('rerebrace-low', 'trim', -arm.upperLength - arm.seamOverlap, -arm.upperLength + 0.004, uw + 0.04, ud + 0.04, 0.025),
];

// Forearm: a couter at the elbow with a round wing on the outside, a vambrace, and a rim at the wrist.
local fw = arm.foreWidth + 2 * g, fd = arm.upperDepth + 2 * g;
local fore = [
  oct('couter', 'plate', -0.045, 0.05, fw + 0.05, fd + 0.05, 0.035),
  round(h.turned('couter-wing', 'trim', 'z', [[0, 0], [0, 0.058], [0.008, 0.048], [0.016, 0]], [0, 0, -(fd + 0.05) / 2 - 0.012])),
  oct('couter-rim', 'trim', -0.05, -0.04, fw + 0.058, fd + 0.058, 0.035),
  oct('vambrace', 'plate', -arm.foreLength + 0.012, -0.05, fw + 0.024, fd + 0.02, 0.025),
  oct('vambrace-rim', 'trim', -arm.foreLength + 0.012, -arm.foreLength + 0.03, fw + 0.034, fd + 0.03, 0.025),
  oct('vambrace-rib', 'trim', -0.12, -0.108, fw + 0.032, fd + 0.028, 0.025),
];

// Thigh: a cuisse with a rim at the hip and a strap or two. Bulk goes front and back, as the legs stand close together.
local tw = leg.thighWidth + 2 * g, td = leg.thighDepth + 2 * g;
local thigh = [
  oct('cuisse', 'plate', -leg.thighLength + 0.02, -0.05, tw + 0.02, td + 0.03, leg.thighChamfer / 2 + 0.015),
  oct('cuisse-rim', 'trim', -0.065, -0.05, tw + 0.03, td + 0.04, leg.thighChamfer / 2 + 0.015),
  oct('cuisse-hem', 'trim', -leg.thighLength + 0.02, -leg.thighLength + 0.034, tw + 0.03, td + 0.04, leg.thighChamfer / 2 + 0.015),
  h.prism('cuisse-ridge', 'trim', 'y', [[(td + 0.03) / 2 - 0.002, -0.016], [(td + 0.03) / 2 + 0.014, 0], [(td + 0.03) / 2 - 0.002, 0.016]], -leg.thighLength + 0.06, -0.08),
] + [
  oct('strap-%d' % i, 'strap', y, y + 0.022, tw + 0.032, td + 0.042, leg.thighChamfer / 2 + 0.015)
  for i in [0, 1]
  for y in [[-0.2, -0.3][i]]
];

// Shin: a poleyn (knee cop with a fan) over a greave with a front ridge.
local shinLength = leg.length - leg.thighLength - leg.shoeHeight;
local sw = leg.shinWidth + 2 * g, sd = leg.shinDepth + 2 * g;
local kneeD = sd + 0.04;
local shin = [
  oct('poleyn', 'plate', -0.07, 0.065, sw + 0.05, kneeD, 0.03),
  round(h.dome('poleyn-cop', 'trim', 0.058, 0.032, 0.009, 'z', [0, 0, kneeD / 2 - 0.004])),
  round(h.turned('poleyn-fan', 'trim', 'x', [[0, 0], [0, 0.05], [0.008, 0.042], [0.016, 0]], [sw / 2 + 0.014, 0, 0])),
  oct('greave', 'plate', -shinLength - leg.ankleOverlap, -0.06, sw + 0.03, sd + 0.025, leg.shinChamfer / 2 + 0.015),
  h.prism('greave-ridge', 'trim', 'y', [[(sd + 0.025) / 2 - 0.002, -0.016], [(sd + 0.025) / 2 + 0.014, 0], [(sd + 0.025) / 2 - 0.002, 0.016]], -shinLength + 0.03, -0.1),
  oct('greave-rim', 'trim', -shinLength - leg.ankleOverlap, -shinLength + 0.012, sw + 0.04, sd + 0.035, leg.shinChamfer / 2 + 0.015),
  oct('greave-top', 'trim', -0.075, -0.062, sw + 0.04, sd + 0.035, leg.shinChamfer / 2 + 0.015),
];

// Gauntlet: a flared steel cuff (from `hands`) and a plate with a knuckle bar over the back of the hand.
local palmX = arm.palmThickness / 2 + fit.layers.normal, palmZ = arm.palmWidth / 2 + fit.layers.normal;
local palmAdd = [
  h.box('back-plate', 'plate', [-palmX - 0.024, -arm.palmLength + 0.005, -palmZ - 0.01], [-palmX, -0.012, palmZ + 0.01]),
  h.box('knuckle-bar', 'trim', [-palmX - 0.034, -arm.palmLength - 0.008, -palmZ - 0.012], [-palmX - 0.016, -arm.palmLength + 0.018, palmZ + 0.012]),
];

// Sabaton shaft: lames up the ankle.
local shaftAdd(r) =
  local shaft = [p for p in std.parseJson(r.parts[0].params.pieces) if p.id == 'shaft'][0];
  [oct('lame-%d' % i, 'collar', shaft.start + 0.04 + i * 0.045, shaft.start + 0.07 + i * 0.045, 0.14, 0.14, 0.03) for i in [0, 1]];

// The armet: a rounded skull with a low comb, a neck flange, and a pointed visor over a vision slit with breaths below.
local helmet = [
  round(h.disc('flange', 'trim', 0.15, 0, 0.034)),
  round(h.disc('shell', 'plate', 0.135, 0.03, 0.27)),
  round(h.dome('crown', 'plate', 0.135, 0.085, 0.014, 'y', [0, 0.265, 0])),
  round(h.disc('brim', 'trim', 0.142, 0.255, 0.27)),
  h.box('comb', 'trim', [-0.012, 0.27, -0.12], [0.012, 0.325, 0.11]),
  // Pointed visor, hinged at the sides, over a pale slit.
  h.prism('visor', 'plate', 'x', [[0.15, 0.115], [0.25, 0.115], [0.255, 0.14], [0.215, 0.185], [0.15, 0.17]], -0.1, 0.1),
  h.prism('bevor', 'plate', 'x', [[0.03, 0.115], [0.15, 0.115], [0.15, 0.165], [0.1, 0.205], [0.04, 0.17]], -0.09, 0.09),
  h.box('slit', 'lens', [-0.085, 0.178, 0.112], [0.085, 0.192, 0.122]),
  h.box('visor-ridge', 'trim', [-0.01, 0.15, 0.17], [0.01, 0.245, 0.19]),
] + [
  h.box('breath-%d' % i, 'lens', [0.02 + (i % 2) * 0.03 - 0.014, 0.065 + (i - i % 2) * 0.017, 0.185], [0.02 + (i % 2) * 0.03 - 0.004, 0.073 + (i - i % 2) * 0.017, 0.2])
  for i in [0, 1, 2, 3]
] + [
  round(h.rod('pivot-%d' % i, 'rivet', 0.02, [-0.165, 0.138][i], [-0.138, 0.165][i], 0.18))
  for i in [0, 1]
];

local gloves = fit.hands('gauntlet_plate', gauntlet, {
  layer: 'normal', cuff: 0.13, flare: 0.04, hem: 0.02, backRidges: 0,
  slots: { hand: 'hand', cuff: 'plate', hem: 'trim', ridge: 'rivet' },
}).rows;
local boots = fit.feet('sabaton_plate', sabaton,
                       { l: 0.35, w: 0.13, s: 0.04, toe: 0.075, instep: 0.115, top: 0.28, shaft: 0.15, laces: 0 }).rows;

armour.of('medieval', [
  row('armor_plate_worn_body', body) + { title: 'Plate body armour' },
  row('armor_plate_worn_upper', upper, 0.008) + { title: 'Plate upper arm armour' },
  row('armor_plate_worn_fore', fore) + { title: 'Plate forearm armour' },
  row('legguard_plate_worn_thigh', thigh) + { title: 'Plate thigh guard' },
  row('legguard_plate_worn_shin', shin) + { title: 'Plate shin guard' },
] + [
  local seg = std.split(r.id, '_worn_')[1];
  if seg == 'palm' then extend(r, palmAdd) else if seg == 'shaft' then extend(r, shaftAdd(r)) else r
  for r in gloves + boots
] + [
  h.compound('helmet_plate_armet', 3.0, helmet, livery + { lens: 'rubber-black' }) + { title: 'Plate armet' } + { voxelGrain: 0.006 },
])
