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
local segmentOf(id) = std.reverse(std.split(id, '_'))[0];
// A worn piece's id taken apart, `<garment>_worn` or `<garment>_worn_<segment>`, or null for any other id: a name that
// merely holds the word is no piece.
local pieceOf(id) =
  local words = std.split(id, '_');
  local n = std.length(words);
  if n >= 2 && words[n - 1] == 'worn' then { garment: std.join('_', words[:n - 1]), segment: null }
  else if n >= 3 && words[n - 2] == 'worn' then { garment: std.join('_', words[:n - 2]), segment: words[n - 1] }
  else null;
{
  // The ground row of the garment a worn family is fitted for, whose authored title and finish the shells reuse, found
  // among the rows of the set file `rows` the kit names, so a kit's key holds that one set and not every set.
  groundRow(rows, id)::
    local found = [row for row in rows if row.id == id];
    assert std.length(found) == 1 : 'the set file the worn kit names holds no ground row `%s`' % id;
    found[0],
  groundTitle(rows, id):: self.groundRow(rows, id).title,
  // A worn piece's id taken apart, { garment, segment }, the segment null for a piece in the doll's piece part; null for
  // an id that is no worn piece. The tail is the id's last word, whatever it names: a carried piece worn over the jacket,
  // `<gear>_worn_jacket`, has `jacket`, which is a layer and no part.
  piece(id):: pieceOf(id),
  // `own` is the taxonomy of the garment the shells belong to; each shell adds its slot and fit.
  shells(own, rows):: [
    row + { taxonomy: taxonomy.over(own, { tags: { slot: [slots[segmentOf(row.id)].slot], fit: ['worn'] } }) }
    for row in rows
  ],
}
