// The power armour set: the trooper's fitted worn shells remade as powered exo-armour. Hard angular gunmetal panels over
// dark graphite, with teal energy-shield light: a chest core, light lines on the arms, thighs and shins, a visor slit, and
// a power pack with glowing windows on the back. Hydraulic pistons run along the thighs, shins and forearms; the
// shoulder plates are slanted slabs, not domes. Worn shells only. Slot `glow` is the set's own light: the game lights
// the material (data/art.gd POWER_GLOW). Built by tools/model into assets/own/skelly/*_power_*.glb.
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local bust = import 'packages/thing-authoring-tool/bust-measures.libsonnet';
local arm = import 'packages/thing-authoring-tool/arm-measures.libsonnet';
local leg = import 'packages/thing-authoring-tool/leg-measures.libsonnet';
local oct = fit.oct;
local g = fit.layers.cloak;

// Graphite panels, gunmetal fittings and pistons, black straps, teal light (`insignia` is the light of the trooper frames).
local livery = { plate: 'steel-gunmetal', trim: 'paint-graphite', strap: 'rubber-offblack', rivet: 'paint-graphite', insignia: 'cell-glow-teal', glow: 'cell-glow-teal' };
local gauntlet = livery + { hand: 'lycra-black' };
local bootFinish = { upper: 'steel-gunmetal', toe: 'paint-graphite', sole: 'rubber-tread', collar: 'cell-glow-teal', laces: 'rubber-offblack' };

local remake(row, drop, add, grain=0.004) =
  local pieces = std.parseJson(row.parts[0].params.pieces);
  h.compound(row.id, 0.1, [p for p in pieces if !drop(p.id)] + add, row.parts[0].finish) + { voxelGrain: grain };
local starts(prefixes) = function(id) std.length([1 for p in prefixes if std.startsWith(id, p)]) > 0;
local find(row, id) = [p for p in std.parseJson(row.parts[0].params.pieces) if p.id == id][0];
local round(piece) = piece + { sides: 12 };
// A piston along y from y0 to y1 at (x, z): a thin dark rod with a thicker gunmetal sleeve over its lower half.
local piston(id, x, z, y0, y1) = [
  round(h.disc(id + '-rod', 'strap', 0.009, y0, y1, x, z)),
  round(h.disc(id + '-sleeve', 'trim', 0.016, y0, (y0 + y1) / 2 + 0.01, x, z)),
];

// Body: a tapering angular chest with a glowing core in a frame, light strips, a pack with glowing windows on the back.
local waistTop = bust.pelvisHeight + bust.waistHeight;
local ribTop = waistTop + bust.ribHeight;
local chestTop = ribTop + bust.chestHeight;
local beltY = waistTop - 0.1;
local lowD = bust.pelvisDepth + 2 * g;
local chestD = bust.chestDepth + 2 * g + 0.03;
local front = chestD / 2 + 0.012, back = -chestD / 2;
local bodyAdd = [
  oct('chest', 'plate', ribTop - 0.03, chestTop, 0.43, chestD, 0.07),
  // Angular breast plate: a wedge that juts forward at the bottom of the chest.
  h.prism('breast', 'plate', 'x', [[ribTop - 0.03, front - 0.01], [ribTop - 0.03, front + 0.04], [chestTop - 0.045, front + 0.012], [chestTop - 0.02, front - 0.01]], -0.19, 0.19),
  h.prism('breast-lower', 'trim', 'x', [[ribTop - 0.07, front - 0.01], [ribTop - 0.07, front + 0.03], [ribTop - 0.025, front + 0.045], [ribTop - 0.03, front - 0.01]], -0.12, 0.12),
  // The core: a dark frame round a glowing diamond.
  h.prism('core-frame', 'trim', 'z', [[0, ribTop + 0.0], [0.07, ribTop + 0.065], [0, ribTop + 0.13], [-0.07, ribTop + 0.065]], front + 0.03, front + 0.05),
  h.prism('core', 'glow', 'z', [[0, ribTop + 0.025], [0.045, ribTop + 0.065], [0, ribTop + 0.105], [-0.045, ribTop + 0.065]], front + 0.05, front + 0.062),
  h.box('breast-line-l', 'glow', [-0.165, ribTop + 0.0, front + 0.036], [-0.15, chestTop - 0.05, front + 0.046]),
  h.box('breast-line-r', 'glow', [0.15, ribTop + 0.0, front + 0.036], [0.165, chestTop - 0.05, front + 0.046]),
  h.box('belt-line', 'glow', [-0.15, beltY + 0.03, lowD / 2 + 0.014], [0.15, beltY + 0.042, lowD / 2 + 0.022]),
  oct('belt', 'strap', beltY, beltY + 0.07, bust.pelvisWidth + 2 * g + 0.03, lowD + 0.03, 0.05),
  h.box('buckle', 'trim', [-0.05, beltY + 0.005, lowD / 2 + 0.012], [0.05, beltY + 0.065, lowD / 2 + 0.03]),
  // Pack: angular side vents, two glowing windows and exhaust vanes up past the shoulders.
  h.box('pack-vent-l', 'trim', [-0.15, ribTop + 0.0, back - 0.09], [-0.13, chestTop - 0.02, back + 0.0]),
  h.box('pack-vent-r', 'trim', [0.13, ribTop + 0.0, back - 0.09], [0.15, chestTop - 0.02, back + 0.0]),
] + [
  h.box('pack-cell-%d' % i, 'glow', [-0.09 + i * 0.1, ribTop + 0.02, back - 0.121], [-0.02 + i * 0.1, chestTop - 0.04, back - 0.109])
  for i in [0, 1]
] + [
  h.prism('vane-%d' % i, 'trim', 'z', [[[-0.11, 0.07][i], chestTop - 0.02], [[-0.07, 0.11][i], chestTop - 0.02], [[-0.095, 0.095][i], chestTop + 0.11], [[-0.11, 0.08][i], chestTop + 0.1]], back - 0.07, back - 0.045)
  for i in [0, 1]
];

// Upper arm: a slanted slab pauldron with a glowing edge, a step plate under it, a rerebrace with a light line.
local uw = arm.upperWidth + 2 * g, ud = arm.upperDepth + 2 * g;
local upperAdd = [
  h.prism('pauldron', 'plate', 'z', [[-0.19, -0.11], [-0.17, -0.03], [-0.11, 0.07], [0.11, 0.07], [0.17, -0.03], [0.19, -0.11]], -0.12, 0.12),
  h.prism('pauldron-top', 'trim', 'z', [[-0.08, 0.07], [-0.05, 0.11], [0.05, 0.11], [0.08, 0.07]], -0.095, 0.095),
  h.box('pauldron-edge', 'glow', [-0.16, -0.065, 0.12], [0.16, -0.05, 0.13]),
  h.prism('pauldron-lame', 'plate', 'z', [[-0.18, -0.115], [0.18, -0.115], [0.15, -0.16], [-0.15, -0.16]], -0.105, 0.105),
  oct('rerebrace', 'plate', -arm.upperLength - arm.seamOverlap, -0.16, uw + 0.04, ud + 0.04, 0.025),
  h.box('rerebrace-line', 'glow', [-0.012, -arm.upperLength + 0.03, (ud + 0.04) / 2], [0.012, -0.19, (ud + 0.04) / 2 + 0.008]),
];

// Forearm: an angular elbow, a vambrace with light lines and a piston along its back.
local fw = arm.foreWidth + 2 * g, fd = arm.upperDepth + 2 * g;
local foreAdd = [
  oct('couter', 'plate', -0.05, 0.055, fw + 0.05, fd + 0.05, 0.04),
  h.prism('couter-spike', 'trim', 'z', [[-0.03, 0.0], [0.03, 0.0], [0.0, -0.05]], -(fd + 0.05) / 2 - 0.025, -(fd + 0.05) / 2),
  oct('vambrace', 'plate', -arm.foreLength + 0.012, -0.06, fw + 0.04, fd + 0.03, 0.03),
  h.box('vambrace-line-f', 'glow', [-0.012, -arm.foreLength + 0.05, (fd + 0.03) / 2], [0.012, -0.11, (fd + 0.03) / 2 + 0.008]),
  h.box('vambrace-line-b', 'glow', [-0.012, -arm.foreLength + 0.05, -(fd + 0.03) / 2 - 0.008], [0.012, -0.11, -(fd + 0.03) / 2]),
  oct('vambrace-cuff', 'trim', -arm.foreLength + 0.012, -arm.foreLength + 0.04, fw + 0.05, fd + 0.04, 0.03),
] + piston('fore-piston', 0, -(fd + 0.03) / 2 - 0.02, -arm.foreLength + 0.06, -0.07);

// Gauntlet: a ribbed cuff (from `hands`) and a gunmetal plate over the back of the hand with a glowing bar.
local palmX = arm.palmThickness / 2 + fit.layers.normal, palmZ = arm.palmWidth / 2 + fit.layers.normal;
local palmAdd = [
  h.box('back-plate', 'plate', [-palmX - 0.026, -arm.palmLength + 0.005, -palmZ - 0.01], [-palmX, -0.012, palmZ + 0.01]),
  h.box('back-line', 'glow', [-palmX - 0.032, -arm.palmLength + 0.02, -0.012], [-palmX - 0.026, -0.03, 0.012]),
  h.box('knuckle-bar', 'trim', [-palmX - 0.036, -arm.palmLength - 0.008, -palmZ - 0.012], [-palmX - 0.018, -arm.palmLength + 0.016, palmZ + 0.012]),
];

// Thigh: a faceted cuisse with a glowing line down the front and hydraulic pistons at the sides.
local tw = leg.thighWidth + 2 * g, td = leg.thighDepth + 2 * g;
local thighAdd = [
  oct('cuisse', 'plate', -leg.thighLength + 0.02, -0.04, tw + 0.03, td + 0.04, leg.thighChamfer / 2 + 0.02),
  h.prism('cuisse-ridge', 'trim', 'y', [[(td + 0.04) / 2 - 0.002, -0.03], [(td + 0.04) / 2 + 0.03, 0], [(td + 0.04) / 2 - 0.002, 0.03]], -leg.thighLength + 0.06, -0.07),
  h.box('cuisse-line', 'glow', [-0.008, -leg.thighLength + 0.09, (td + 0.04) / 2 + 0.028], [0.008, -0.1, (td + 0.04) / 2 + 0.034]),
  oct('cuisse-hip', 'trim', -0.075, -0.04, tw + 0.045, td + 0.05, leg.thighChamfer / 2 + 0.02),
] + piston('thigh-piston-l', -tw / 2 - 0.022, 0.02, -leg.thighLength + 0.03, -0.09)
  + piston('thigh-piston-r', tw / 2 + 0.022, 0.02, -leg.thighLength + 0.03, -0.09);

// Shin: an angular knee guard, a greave with a front blade, a light line and a piston behind the calf.
local shinLength = leg.length - leg.thighLength - leg.shoeHeight;
local sw = leg.shinWidth + 2 * g, sd = leg.shinDepth + 2 * g;
local kneeD = sd + 0.05;
local shinAdd = [
  oct('knee', 'plate', -0.075, 0.07, sw + 0.05, kneeD, 0.03),
  h.prism('knee-guard', 'trim', 'x', [[-0.075, kneeD / 2 - 0.004], [0.0, kneeD / 2 + 0.05], [0.075, kneeD / 2 - 0.004]], -0.06, 0.06),
  oct('greave', 'plate', -shinLength - leg.ankleOverlap, -0.07, sw + 0.04, sd + 0.04, leg.shinChamfer / 2 + 0.02),
  h.prism('greave-ridge', 'trim', 'y', [[(sd + 0.04) / 2 - 0.002, -0.025], [(sd + 0.04) / 2 + 0.025, 0], [(sd + 0.04) / 2 - 0.002, 0.025]], -shinLength + 0.03, -0.11),
  h.box('greave-line', 'glow', [-0.008, -shinLength + 0.07, (sd + 0.04) / 2 + 0.022], [0.008, -0.12, (sd + 0.04) / 2 + 0.028]),
  oct('greave-rim', 'glow', -shinLength - leg.ankleOverlap, -shinLength + 0.01, sw + 0.05, sd + 0.05, leg.shinChamfer / 2 + 0.02),
] + piston('shin-piston', 0, -(sd + 0.04) / 2 - 0.02, -shinLength + 0.03, -0.09);

// The helm: an angular shell with a swept crown, a glowing visor slit, vents, light strips on the cheeks and a rear fin.
local helmet = [
  h.box('skirt', 'trim', [-0.135, 0, -0.15], [0.135, 0.035, 0.15]),
  h.box('shell', 'plate', [-0.125, 0.03, -0.14], [0.125, 0.25, 0.14]),
  h.prism('crown', 'plate', 'x', [[0.25, -0.14], [0.25, 0.14], [0.29, 0.07], [0.31, -0.06], [0.29, -0.14]], -0.115, 0.115),
  h.prism('brow', 'trim', 'x', [[0.19, 0.12], [0.225, 0.1], [0.235, 0.17], [0.2, 0.17]], -0.13, 0.13),
  h.box('visor', 'glow', [-0.1, 0.155, 0.135], [0.1, 0.185, 0.15]),
  h.prism('jaw', 'plate', 'x', [[0.035, 0.12], [0.15, 0.13], [0.15, 0.175], [0.05, 0.17]], -0.075, 0.075),
  h.prism('fin', 'trim', 'x', [[0.28, -0.12], [0.34, -0.1], [0.37, -0.14], [0.27, -0.14]], -0.012, 0.012),
] + [
  h.box('vent-%d' % i, 'strap', [-0.04, 0.07 + i * 0.022, 0.17], [0.04, 0.081 + i * 0.022, 0.18])
  for i in [0, 1, 2]
] + [
  h.box('cheek-%d' % i, 'trim', [[-0.14, 0.125][i], 0.06, -0.06], [[-0.125, 0.14][i], 0.2, 0.12])
  for i in [0, 1]
] + [
  h.box('cheek-light-%d' % i, 'glow', [[-0.146, 0.14][i], 0.1, 0.0], [[-0.14, 0.146][i], 0.16, 0.1])
  for i in [0, 1]
];

local body = fit.trooper('armor_power', livery).rows;
local legs = fit.trooperLegs('legguard_power', livery).rows;
local gloves = fit.hands('gloves_power', gauntlet, {
  layer: 'normal', cuff: 0.13, flare: 0.05, hem: 0.018, backRidges: 0,
  slots: { hand: 'hand', cuff: 'plate', hem: 'insignia', ridge: 'rivet' },
}).rows;
local boots = fit.feet('boots_power', bootFinish,
                       { l: 0.33, w: 0.135, s: 0.04, toe: 0.075, instep: 0.1, top: 0.275, shaft: 0.14, laces: 0 }).rows;
local shaftGuard(row) =
  local shaft = find(row, 'shaft');
  h.prism('shaft-guard', 'toe', 'z', [[-0.07, shaft.start + 0.015], [0.07, shaft.start + 0.015], [0.08, shaft.end - 0.01], [-0.08, shaft.end - 0.01]], 0.065, 0.085);

local forArmour = {
  body: function(r) remake(r, starts(['chest', 'slab', 'chevron', 'rivet', 'belt', 'buckle', 'stack', 'pouch']), bodyAdd),
  upper: function(r) remake(r, starts(['pauldron', 'comb', 'rerebrace']), upperAdd, 0.004),
  fore: function(r) remake(r, starts(['couter', 'vambrace']), foreAdd),
  palm: function(r) remake(r, starts([]), palmAdd),
  thigh: function(r) remake(r, starts(['cuisse', 'strap']), thighAdd),
  shin: function(r) remake(r, starts(['knee', 'greave']), shinAdd),
  shaft: function(r) remake(r, starts([]), [shaftGuard(r)]),
};
[
  local seg = std.split(r.id, '_worn_')[1];
  if std.objectHas(forArmour, seg) then forArmour[seg](r) else r
  for r in body + gloves + legs + boots
] + [
  h.compound('helmet_power', 3.0, helmet, livery + { lens: 'cell-glow-teal', grille: 'rubber-black' }) + { voxelGrain: 0.004 },
]
