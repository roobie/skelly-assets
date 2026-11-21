// Where the plate armet (models/kits/plate.libsonnet) sits on the player's head: the heights of its vision slit in its
// own frame, and the height of that frame in the bust's head frame that puts the slit over the eyes. A figure that wears
// the armet without the doll, such as the warrior statue, seats it here, so it moves with the head the armet is drawn
// round.
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local slit = [0.178, 0.192];
{
  slit: slit,
  base: fit.eyesAt((slit[0] + slit[1]) / 2),
}
