// Taxonomy for worn shells (models/TAXONOMY.md): the slot a shell covers is the segment its id ends in, and every shell
// is shaped for the player body, so an author names only what the garment is.
local taxonomy = import '../../jsonnet/lib/taxonomy.libsonnet';
// The segments a shell id may end in, `<item>_worn_<segment>`: the names worn-fit.libsonnet's templates and the
// hand-built shells in models/worn-clothing.libsonnet give their shells.
local segments = ['body', 'upper', 'fore', 'palm', 'fingers', 'thumb', 'pelvis', 'thigh', 'shin', 'foot', 'shaft'];
local slots = import 'models/worn-slots.libsonnet';
// The slot map is content keyed by those names, so a segment it misses or a key that names no segment is reported
// here rather than when some shell first lacks a slot.
local unmapped = std.setDiff(std.set(segments), std.set(std.objectFields(slots)));
local unknown = std.setDiff(std.set(std.objectFields(slots)), std.set(segments));
assert unmapped == [] && unknown == [] : 'worn slot map: segments with no slot %s, keys that are no segment %s' % [unmapped, unknown];
local segmentOf(id) = std.reverse(std.split(id, '_'))[0];
{
  // `own` is the taxonomy of the garment the shells belong to; each shell adds its slot and fit.
  shells(own, rows):: [
    row + { taxonomy: taxonomy.over(own, { tags: { slot: [slots[segmentOf(row.id)].slot], fit: ['worn'] } }) }
    for row in rows
  ],
}
