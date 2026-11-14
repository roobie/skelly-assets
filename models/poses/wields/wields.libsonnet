// The doll's melee wields, as key frames tools/wields.mjs writes as pose files (models/poses/<class>_stance_<name>.json
// and <class>_strike_<name>-<key>.json), as sequences the pose page plays and as the clips a game plays. A class names
// the weapon it holds, if any, its stances and its strikes; each class file says how it stands and strikes.
//
// A key frame places the hands, not the arms: `body` turns the trunk and legs (every key of a class turns the same
// bones, so any two blend bone for bone), `weapon` places the held weapon and `free` places each empty hand, and the
// arms reach by two-bone IK. Points are metres from the shoulder of the hand they belong to, in the chest's frame (the
// figure faces +z, its right is -x, up is +y), so a twisting chest carries the hands round with it. A weapon's `at` is
// its grip point, from its leading hand's shoulder; `aim` turns it in the chest's frame, from pointing straight ahead:
// yaw (degrees toward the figure's left) after pitch (degrees tipping its working end down) after roll (about its own
// length); `poles` point each holding elbow. A free hand's `at` is its wrist; `twist` rolls its forearm (pronation)
// and `wrist` bends it [flex, deviation toward the thumb].
//
// A strike runs guard, `windup`, `hit`, `follow` and back to guard. Its phases (tools/wields.mjs, `PHASES`) take
// `shares` of its `seconds`: wind-up to the windup key, strike to the hit, follow-through to the follow key and recovery
// back to guard. The hit falls where the strike phase ends, so a game scales the clip to its own cooldown and keeps the
// hit where it lands. A blow speeds up from the wind-up into the hit and slows after it, so the strike eases in and the
// follow-through eases out, meeting at speed; the wind-up and recovery move from rest to rest.
{
  framesPerSecond: 30,
  easing: { windup: 'minimum-jerk', strike: 'ease-in', follow: 'ease-out', recovery: 'minimum-jerk' },
  classes: {
    unarmed: import 'unarmed.libsonnet',
    onehand: import 'onehand.libsonnet',
    twohand: import 'twohand.libsonnet',
  },
}
