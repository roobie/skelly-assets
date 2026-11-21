// The medieval plate set: a bright steel harness in the fitted worn frames of the trooper and heavy looks. A breastplate
// over a plackart with a keel, three fauld lames and tassets, a lamed gorget, rounded pauldrons with stepped lames,
// rerebraces, couters with a wing, vambraces, steel gauntlets, cuisses, poleyns, greaves, pointed sabatons and an armet
// with a pointed visor. Worn shells only.
local armour = import 'models/armour.libsonnet';
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local bust = import 'models/measures/bust.libsonnet';
local arm = import 'models/measures/arm.libsonnet';
local leg = import 'models/measures/leg.libsonnet';
local armetSeat = import 'models/armet-seat.libsonnet';
local oct = fit.oct;
local g = fit.layers.over;

// Hardened steel plate, bright rims and bosses, black leather straps, brass rivets.
local livery = { plate: 'steel-plate', trim: 'steel-bright', strap: 'leather-black', rivet: 'brass-polished', insignia: 'steel-bright' };
// The gauntlet's fingers are steel: a piece on each phalanx is the lame a fingered gauntlet rivets over each joint.
local gauntlet = livery + { hand: 'steel-plate' };
local sabaton = { upper: 'steel-plate', toe: 'steel-bright', sole: 'leather-black', collar: 'steel-bright', laces: 'leather-black' };

local round(piece) = piece + { sides: 16 };
// The grain a row is voxelised at unless it names a coarser one.
local fineGrain = 0.004;
local row(id, pieces, grain=fineGrain) = h.compound(id, 0.1, pieces, livery) + { voxelGrain: grain };
// A fitted row with `add` appended to its pieces.
local extend(r, add, grain=fineGrain) = fit.refit(r, std.parseJson(r.parts[0].params.pieces) + add, grain);

// Body: breastplate with a keel over a plackart, three fauld lames, a pair of tassets in front, a gorget of two lames.
local waistTop = bust.pelvisHeight + bust.waistHeight;
local ribTop = waistTop + bust.ribHeight;
local chestTop = ribTop + bust.chestHeight;
local cut = bust.torsoChamfer / 2;
local chestW = bust.chestWidth + 2 * g + 0.03, chestD = bust.chestDepth + 2 * g + 0.045;
local lowW = bust.pelvisWidth + 2 * g, lowD = bust.pelvisDepth + 2 * g;
local skirtTop = waistTop - 0.04;
// The breast stands this far off the shoulders, cut to their slope.
local shoulderRise = 0.015;
// A shoulder strap lies on the breast's top: sunk this far into it, so no gap shows, and standing this far proud of it.
local strapSink = 0.003, strapProud = 0.005;
local body = [
  oct('plackart', 'plate', skirtTop, ribTop + 0.01, bust.waistWidth + 2 * g + 0.02, bust.ribDepth + 2 * g + 0.03, cut),
  oct('plackart-rim', 'trim', skirtTop, skirtTop + 0.012, bust.waistWidth + 2 * g + 0.03, bust.ribDepth + 2 * g + 0.04, cut),
  oct('breast', 'plate', ribTop - 0.04, chestTop + shoulderRise, chestW, chestD, 0.07) + { clip: fit.trapezius(shoulderRise) },
  oct('breast-rim', 'trim', ribTop - 0.04, ribTop - 0.026, chestW + 0.01, chestD + 0.01, 0.07),
  // The keel: a ridge down the breast's front, turning the lance aside.
  h.prism('keel', 'trim', 'y', [[chestD / 2 - 0.004, -0.035], [chestD / 2 + 0.03, 0], [chestD / 2 - 0.004, 0.035]], ribTop - 0.03, chestTop - 0.02),
  // A cap over each deltoid, so the pauldron meets plate as the arm lifts it. It stands two of the row's voxels off the
  // deltoid, so rounding to them cannot sink it into the deltoid.
  fit.deltoidCap('shoulder-left', 'plate', 1, 2 * fineGrain),
  fit.deltoidCap('shoulder-right', 'plate', -1, 2 * fineGrain),
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
  // Straps and rivets: shoulder straps over the breast's top from front to back, buckles on the breast's edge.
  fit.slopeBand('strap-%d' % k, 'strap', [[-0.13, 0.11][k], [-0.11, 0.13][k]], [-chestD / 2, chestD / 2],
                [shoulderRise - strapSink, shoulderRise + strapProud])
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
// Its brow anchor is the point of its skull that a seat with the slit over the eyes puts at the hairline. The skull is
// drawn round the head that seat puts it on, short of the hair's top, which the crown closes over; each fitting stands
// on the face of the skull it meets, so a taller or deeper head carries them with it.
local slitHeights = armetSeat.slit;
local helmetBase = armetSeat.base;
local head = fit.headroom(helmetBase);
local radius = head.reach + 0.023, foot = head.chin - 0.019, top = head.top - 0.02;
local slit = { min: [-0.085, slitHeights[0], radius - 0.023], max: [0.085, slitHeights[1], radius - 0.013] };
local helmet = [
  round(h.disc('flange', 'trim', radius + 0.015, foot - 0.03, foot + 0.004)),
  round(h.disc('shell', 'plate', radius, foot, top)),
  round(h.dome('crown', 'plate', radius, 0.085, 0.014, 'y', [0, top - 0.005, 0])),
  round(h.disc('brim', 'trim', radius + 0.007, top - 0.015, top)),
  h.box('comb', 'trim', [-0.012, top, -(radius - 0.015)], [0.012, top + 0.055, radius - 0.025]),
  // Pointed visor, hinged at the sides, over a pale slit.
  h.prism('visor', 'plate', 'x', [[0.15, radius - 0.02], [0.25, radius - 0.02], [0.255, radius + 0.005], [0.215, radius + 0.05], [0.15, radius + 0.035]], -0.1, 0.1),
  h.prism('bevor', 'plate', 'x', [[foot, radius - 0.02], [0.15, radius - 0.02], [0.15, radius + 0.03], [foot + 0.07, radius + 0.07], [foot + 0.01, radius + 0.035]], -0.09, 0.09),
  h.box('slit', 'lens', slit.min, slit.max),
  h.box('visor-ridge', 'trim', [-0.01, 0.15, radius + 0.035], [0.01, 0.245, radius + 0.055]),
] + [
  h.box('breath-%d' % i, 'lens', [0.02 + (i % 2) * 0.03 - 0.014, foot + 0.035 + (i - i % 2) * 0.017, radius + 0.05], [0.02 + (i % 2) * 0.03 - 0.004, foot + 0.043 + (i - i % 2) * 0.017, radius + 0.065])
  for i in [0, 1, 2, 3]
] + [
  round(h.rod('pivot-%d' % i, 'rivet', 0.02, [-(radius + 0.03), radius + 0.003][i], [-(radius + 0.003), radius + 0.03][i], 0.18))
  for i in [0, 1]
];

local gloves = fit.hands('gauntlet_plate', gauntlet, {
  layer: 'normal', cuff: 0.13, flare: 0.04, hem: 0.02, backRidges: 0,
  slots: { hand: 'hand', cuff: 'plate', hem: 'trim', ridge: 'rivet' },
}, 'Plate gauntlets');
local boots = fit.feet('sabaton_plate', sabaton,
                       { l: 0.35, w: 0.13, s: 0.04, toe: 0.115, instep: 0.155, top: 0.32, shaft: 0.15, laces: 0 }, { covers: ['foot'] }, title='Plate sabatons');

// Each item's rows, in item order. The breastplate encloses the trunk and the greave the shin, so each hides that skin;
// the shoulders stay drawn under the pauldrons, which ride the upper arm, and so do the arms and thighs, whose plates
// leave a joint's cap bare.
local fitted(r) = local seg = std.split(r.id, '_worn_')[1]; if seg == 'palm' then extend(r, palmAdd) else if seg == 'shaft' then extend(r, shaftAdd(r)) else r;
local set = {
  armor_plate: { rows: [
    row('armor_plate_worn_body', body) + { title: 'Plate body armour', covers: ['trunk'] },
    row('armor_plate_worn_upper', upper, 0.008) + { title: 'Plate upper arm armour' },
    row('armor_plate_worn_fore', fore) + { title: 'Plate forearm armour' },
  ] },
  legguard_plate: { rows: [
    row('legguard_plate_worn_thigh', thigh) + { title: 'Plate thigh guard' },
    row('legguard_plate_worn_shin', shin) + { title: 'Plate shin guard', covers: ['shin'] },
  ] },
  gauntlet_plate: gloves + { rows: [fitted(r) for r in gloves.rows] },
  sabaton_plate: boots + { rows: [fitted(r) for r in boots.rows] },
  helmet_plate_armet: {
    rows: [h.compound('helmet_plate_armet', 3.0, helmet, livery + { lens: 'rubber-black' }) + {
      title: 'Plate armet',
      voxelGrain: 0.006,
      anchors: { brow: fit.browAnchor('helmet_plate_armet', 'shell', [-radius, foot, -radius], [radius, top, radius], head.brow) },
    }],
  },
};
std.flattenArrays([armour.of('medieval', set[k].rows) for k in std.objectFields(set)])
