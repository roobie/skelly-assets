// For each segment a worn shell's id ends in (packages/thing-authoring-tool/worn-taxonomy.libsonnet's `segments`): the
// body slot (models/TAXONOMY.md) the shell covers, and the doll part (models/dressing.libsonnet) whose frame it is drawn
// in. A boot's shaft is drawn in the knee's frame so a flexed ankle does not pierce it. A phalanx segment is drawn in
// the phalanx part of the same name, so a glove bends at every finger and thumb joint.
local hand = import 'models/measures/hand.libsonnet';
local phalanges = { [hand.part(finger, k)]: { slot: 'hands', part: hand.part(finger, k) } for finger in hand.fingers for k in std.range(0, hand.phalanges - 1) }
                  + { [hand.thumbPart(k)]: { slot: 'hands', part: hand.thumbPart(k) } for k in std.range(0, hand.thumbBones - 1) };
{
  body: { slot: 'torso', part: 'torso' },
  upper: { slot: 'arms', part: 'upper' },
  fore: { slot: 'arms', part: 'fore' },
  palm: { slot: 'hands', part: 'palm' },
  pelvis: { slot: 'legs', part: 'pelvis' },
  thigh: { slot: 'legs', part: 'thigh' },
  shin: { slot: 'legs', part: 'shin' },
  foot: { slot: 'feet', part: 'foot' },
  shaft: { slot: 'feet', part: 'shin' },
} + phalanges
