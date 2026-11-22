// The plate harness's body in the bust's frame (models/kits/plate.libsonnet): a breastplate with a keel over a
// plackart, three fauld lames, a pair of tassets in front and a gorget of two lames. The pieces `over` the shoulder
// girdle are kept apart, since the worn rows share them with the player's clavicles, while the warrior statue
// (models/catalogue/sets/warrior-statue.libsonnet) carves the harness whole.
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local bust = import 'models/measures/bust.libsonnet';
local oct = fit.oct;
local g = fit.layers.over;

local waistTop = bust.pelvisHeight + bust.waistHeight;
local ribTop = waistTop + bust.ribHeight;
local chestTop = ribTop + bust.chestHeight;
local cut = bust.torsoChamfer / 2;
// The breast stands off the chest's flanks by no more than a layer, as the arms hang close beside them: a wider one
// passes through the hanging arm.
local chestW = bust.chestWidth + 2 * g, chestD = bust.chestDepth + 2 * g + 0.045;
local lowW = bust.pelvisWidth + 2 * g, lowD = bust.pelvisDepth + 2 * g;
local skirtTop = waistTop - 0.04;
// The breast stands this far off the shoulders, cut to their slope.
local shoulderRise = 0.015;
// A shoulder strap lies on the breast's top: sunk this far into it, so no gap shows, and standing this far proud of it.
local strapSink = 0.003, strapProud = 0.005;
// The buckles' rivets keep their place on the breast's edge, the outer one this far inside the chest's side.
local rivetX = bust.chestWidth / 2 - 0.01;
{
  pieces: [
    oct('plackart', 'plate', skirtTop, ribTop + 0.01, bust.waistWidth + 2 * g + 0.02, bust.ribDepth + 2 * g + 0.03, cut),
    oct('plackart-rim', 'trim', skirtTop, skirtTop + 0.012, bust.waistWidth + 2 * g + 0.03, bust.ribDepth + 2 * g + 0.04, cut),
    oct('breast-rim', 'trim', ribTop - 0.04, ribTop - 0.026, chestW + 0.01, chestD + 0.01, bust.chestBackCut),
    // The keel: a ridge down the breast's front, turning the lance aside.
    h.prism('keel', 'trim', 'y', [[chestD / 2 - 0.004, -0.035], [chestD / 2 + 0.03, 0], [chestD / 2 - 0.004, 0.035]], ribTop - 0.03, chestTop - 0.02),
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
    // The buckles' rivets on the breast's edge.
    h.box('rivet-%d' % k, 'rivet', [[-rivetX, rivetX - 0.012][k], ribTop + 0.06, chestD / 2 - 0.03], [[-(rivetX - 0.012), rivetX][k], ribTop + 0.075, chestD / 2 - 0.018])
    for k in [0, 1]
  ],
  over: [
    oct('breast', 'plate', ribTop - 0.04, chestTop + shoulderRise, chestW, chestD, bust.chestBackCut) + { clip: fit.trapezius(shoulderRise) },
    // A cap over each deltoid, so the pauldron meets plate as the arm lifts it. It stands off the deltoid as the breast
    // does off the shoulders, which also clears the top of the arm the deltoid caps, as that is not round.
    fit.deltoidCap('shoulder-left', 'plate', 1, shoulderRise),
    fit.deltoidCap('shoulder-right', 'plate', -1, shoulderRise),
  ] + [
    // Shoulder straps over the breast's top from front to back.
    fit.slopeBand('strap-%d' % k, 'strap', [[-0.13, 0.11][k], [-0.11, 0.13][k]], [-chestD / 2, chestD / 2],
                  [shoulderRise - strapSink, shoulderRise + strapProud])
    for k in [0, 1]
  ],
}
