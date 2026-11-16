// The doll's held guns, as key frames tools/wields.mjs writes as pose files (models/poses/<gun>_stance_<name>.json) and
// bakes as the clips a game plays, one set per gun family: a gun's fore-end sits a different way ahead of its grip on
// each, so a clip baked on one gun would leave the support hand off another, and a game plays clips without solving the
// arms (docs/decisions/0010-pose-tool.md). Only the families listed have a proven hold; others ship no clip.
local longgun = import 'longgun.libsonnet';
local sockets = import 'sockets.libsonnet';
local families = ['rifle_assault', 'rifle_pipe', 'shotgun_pump'];
{
  classes: { [family]: longgun(family, sockets[family]) for family in families },
}
