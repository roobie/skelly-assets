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
{
  classes: { [family]: longgun(family, sockets[family], std.get(swayLimitDeg, family)) for family in families },
}
