// For each segment a worn shell's id ends in (packages/thing-authoring-tool/worn-taxonomy.libsonnet's `segments`): the
// body slot (models/TAXONOMY.md) the shell covers, and the doll part (models/dressing.libsonnet) whose frame it is drawn
// in. A boot's shaft is drawn in the knee's frame so a flexed ankle does not pierce it.
{
  body: { slot: 'torso', part: 'torso' },
  upper: { slot: 'arms', part: 'upper' },
  fore: { slot: 'arms', part: 'fore' },
  palm: { slot: 'hands', part: 'palm' },
  fingers: { slot: 'hands', part: 'fingers' },
  thumb: { slot: 'hands', part: 'thumb' },
  pelvis: { slot: 'legs', part: 'pelvis' },
  thigh: { slot: 'legs', part: 'thigh' },
  shin: { slot: 'legs', part: 'shin' },
  foot: { slot: 'feet', part: 'foot' },
  shaft: { slot: 'feet', part: 'shin' },
}
