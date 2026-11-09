// Taxonomy for worn shells (models/TAXONOMY.md): the slot a shell covers is the segment its id ends in, and every shell
// is shaped for the player body, so an author names only what the garment is.
local taxonomy = import '../../jsonnet/lib/taxonomy.libsonnet';
local slots = {
  body: 'torso',
  upper: 'arms',
  fore: 'arms',
  palm: 'hands',
  fingers: 'hands',
  thumb: 'hands',
  pelvis: 'legs',
  thigh: 'legs',
  shin: 'legs',
  foot: 'feet',
  shaft: 'feet',
};
local segmentOf(id) = std.reverse(std.split(id, '_'))[0];
{
  // `own` is the taxonomy of the garment the shells belong to; each shell adds its slot and fit.
  shells(own, rows):: [
    row + { taxonomy: taxonomy.over(own, { tags: { slot: [slots[segmentOf(row.id)]], fit: ['worn'] } }) }
    for row in rows
  ],
}
