// A shouldered stock's pocket, the point a key frame stands its butt at, which tools/wields.mjs reads from the right
// shoulder joint in the chest's frame. It is given from the chest instead: `inside` the chest's side, `below` the joint
// and `behind` the chest's front. The stock bears on the chest, so the pocket follows the chest's girths as well as
// the joint.
local bust = import 'models/measures/bust.libsonnet';
function(inside, below, behind)
  [bust.shoulderJointOut + inside, -below, bust.chestDepth / 2 - bust.shoulderJointForward - behind]
