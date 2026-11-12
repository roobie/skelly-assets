// Taxonomy for worn shells (models/TAXONOMY.md): the slot a shell covers is the segment its id ends in, and every shell
// is shaped for the player body, so an author names only what the garment is.
local taxonomy = import '../../jsonnet/lib/taxonomy.libsonnet';
// The segments a shell id may end in, `<item>_worn_<segment>`: the names worn-fit.libsonnet's templates give their
// shells.
local hand = import 'models/measures/hand.libsonnet';
local segments = ['body', 'upper', 'fore', 'palm', 'pelvis', 'thigh', 'shin', 'foot', 'shaft']
                 + [hand.thumbPart(k) for k in std.range(0, hand.thumbBones - 1)]
                 + [hand.part(finger, k) for finger in hand.fingers for k in std.range(0, hand.phalanges - 1)];
local slots = import 'models/worn-slots.libsonnet';
// The slot map is content keyed by those names, so a segment it misses or a key that names no segment is reported
// here rather than when some shell first lacks a slot.
local unmapped = std.setDiff(std.set(segments), std.set(std.objectFields(slots)));
local unknown = std.setDiff(std.set(std.objectFields(slots)), std.set(segments));
assert unmapped == [] && unknown == [] : 'worn slot map: segments with no slot %s, keys that are no segment %s' % [unmapped, unknown];
local groundRows = std.flattenArrays(std.objectValues(import 'models/catalogue/sets/index.libsonnet'));
local segmentOf(id) = std.reverse(std.split(id, '_'))[0];
{
  // The ground row of the garment a worn family is fitted for, whose authored title and finish the shells reuse.
  groundRow(id):: [row for row in groundRows if row.id == id][0],
  groundTitle(id):: self.groundRow(id).title,
  // `own` is the taxonomy of the garment the shells belong to; each shell adds its slot and fit.
  shells(own, rows):: [
    row + { taxonomy: taxonomy.over(own, { tags: { slot: [slots[segmentOf(row.id)].slot], fit: ['worn'] } }) }
    for row in rows
  ],
}
