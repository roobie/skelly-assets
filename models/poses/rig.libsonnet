// The doll's rig: one bone per doll part (models/catalogue/sets/avatar.libsonnet), named as mobgen names the same
// bone so a clip or a game reads a doll pose and a mob pose alike. tools/pose/rig.mjs, `dollRig`, reads each bone's
// pivot from the built doll (tools/dress.mjs, `readDoll`) and gives the sided bones their `.R` and `.L` copies. Why
// the doll shares mobgen's bone model is in docs/decisions/0010-pose-tool.md.
//
// `pivot` is `origin`, the part's own origin, which the avatar draws at the joint it hangs from, or `{ anchor }`, a
// bust anchor. `along` is the bone's rest direction, used to find its tail when it has no child bone. `flexAxis` is
// the frame's x: positive flex bends the way the joint works most (a limb swings forward, an elbow and a knee close,
// toes point down, the trunk and head bend forward). Twist is about the bone, abduction about the remaining axis.
// Limits are degrees [min, max], written for the `reference` side, the figure's left (+x), where positive abduction
// carries a limb away from the body; the other side gets the twist and abduction ranges mirrored, so a pose is
// mirrored by negating those two angles.
local trunk = { model: 'player_bust' };
local arm = { model: 'player_arm', sided: true, parent: 'spine', along: [0, -1, 0], flexAxis: [-1, 0, 0] };
local leg = { model: 'player_leg', sided: true, parent: 'pelvis', along: [0, -1, 0] };
{
  root: 'pelvis',
  reference: 'left',
  bones: {
    pelvis: trunk { part: 'pelvis', parent: null, pivot: 'origin', along: [0, 1, 0], flexAxis: [1, 0, 0],
                    limits: { flex: [-20, 20], twist: [-30, 30], abduct: [-15, 15] } },
    spine: trunk { part: 'torso', parent: 'pelvis', pivot: { anchor: 'spine' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                   limits: { flex: [-30, 60], twist: [-80, 80], abduct: [-35, 35] } },
    neck: trunk { part: 'neck', parent: 'spine', pivot: { anchor: 'neck' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                  limits: { flex: [-30, 40], twist: [-60, 60], abduct: [-30, 30] } },
    head: trunk { part: 'head', parent: 'neck', pivot: { anchor: 'head' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                  limits: { flex: [-30, 30], twist: [-45, 45], abduct: [-20, 20] } },
    upperArm: arm { part: 'upper', pivot: 'origin', limits: { flex: [-50, 170], twist: [-70, 90], abduct: [-30, 170] } },
    forearm: arm { part: 'fore', parent: 'upperArm', pivot: 'origin', limits: { flex: [0, 150], twist: [-80, 80], abduct: [0, 0] } },
    hand: arm { part: 'palm', parent: 'forearm', pivot: 'origin', limits: { flex: [-70, 80], twist: [0, 0], abduct: [-25, 20] } },
    fingers: arm { part: 'fingers', parent: 'hand', pivot: 'origin', limits: { flex: [0, 90], twist: [0, 0], abduct: [0, 0] } },
    thumb: arm { part: 'thumb', parent: 'hand', pivot: 'origin', limits: { flex: [-20, 60], twist: [0, 0], abduct: [-30, 40] } },
    thigh: leg { part: 'thigh', pivot: 'origin', flexAxis: [-1, 0, 0], limits: { flex: [-20, 120], twist: [-40, 40], abduct: [-20, 50] } },
    shin: leg { part: 'shin', parent: 'thigh', pivot: 'origin', flexAxis: [1, 0, 0], limits: { flex: [0, 140], twist: [0, 0], abduct: [0, 0] } },
    foot: leg { part: 'foot', parent: 'shin', pivot: 'origin', along: [0, 0, 1], flexAxis: [1, 0, 0], limits: { flex: [-30, 45], twist: [-10, 10], abduct: [-20, 20] } },
  },
}
