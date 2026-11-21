// The doll's held guns, as key frames tools/wields.mjs writes as pose files (models/poses/<gun>_stance_<name>.json) and
// bakes as the clips a game plays, one set per gun family: a gun's fore-end sits a different way ahead of its grip on
// each, so a clip baked on one gun would leave the support hand off another, and a game plays clips without solving the
// arms (docs/decisions/0010-pose-tool.md). Only the families listed have a proven hold; others ship no clip.
local longgun = import 'longgun.libsonnet';
local sockets = import 'sockets.libsonnet';
local families = ['rifle_assault', 'rifle_pipe', 'shotgun_pump'];
// How far a family's gun may sway either way while walking at low ready, in degrees, where its fore-end lies so far
// ahead that a fuller sway carries it out of the support hand's reach; a family not listed sways as far as the stride
// swings it. The pump's fore-end stands at the edge of the left arm's reach already.
local swayLimitDeg = { shotgun_pump: 0.5 };
// How a family stands its stances where the hold's own (longgun.libsonnet) does not fit its gun.
// The pump's fore-end lies so far ahead that only a strongly bladed chest brings the left hand to it. Turned that far,
// the right arm lies back along the stock: shouldered, the elbow is raised and drawn back to open the pocket rather
// than let the upper arm cross the butt, and the butt sits lower in it, where the dropped stock seats; at low ready the
// butt drops further, inside the arm, the elbow swings out and forward to let the stock pass beside it, and the muzzle
// tips down less, as a stock tipped further rides up the forearm.
local stands = {
  shotgun_pump: {
    idle: { twist: 78, pocket: [0.07, 0.11, -0.02], pitch: 14, poles: { 'hand.R': [-1, -0.85, 0.4], 'hand.L': [-0.3, -1, 0] } },
    guard: { twist: 75, pocket: [0.02, 0.07, -0.02], poles: { 'hand.R': [-1, 0.1, -0.5], 'hand.L': [-0.2, -1, 0.2] } },
  },
};
{
  classes: {
    [family]: longgun(family, sockets[family], std.get(stands, family, {}), std.get(swayLimitDeg, family))
    for family in families
  },
}
