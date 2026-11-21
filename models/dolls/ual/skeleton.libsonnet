// The UAL mannequin's rest skeleton (skeleton.json, written from its GLB by tools/ual-skeleton.mjs) as the doll's
// measures and rig read it: each bone's head in the doll frame, and its node's rest turn composed from the root, as the
// doll's rig states a node's turn in the model's axes rather than its parent's.
local bones = (import 'skeleton.json').bones;
// The Hamilton product a * b of quaternions [x, y, z, w]: b's turn, then a's.
local times(a, b) = [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
local turn(name) =
  local bone = bones[name];
  if bone.parent == null then bone.rotation else times(turn(bone.parent), bone.rotation);
{
  bones: bones,
  head(name):: bones[name].head,
  // From the head of `from` to the head of `to`, in the doll frame.
  delta(from, to):: [bones[to].head[i] - bones[from].head[i] for i in [0, 1, 2]],
  rotation(name):: turn(name),
}
