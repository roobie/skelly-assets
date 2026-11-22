// Taxonomy for worn shells (models/TAXONOMY.md): the slot a shell covers is the segment its id ends in, and every shell
// is shaped for the player body, so an author names only what the garment is.
local taxonomy = import '../../jsonnet/lib/taxonomy.libsonnet';
// The segments a shell id may end in, `<item>_worn_<segment>`: the names worn-fit.libsonnet's templates give their
// shells.
local hand = import 'models/measures/hand.libsonnet';
local segments = ['body', 'upper', 'fore', 'palm', 'pelvis', 'thigh', 'shin', 'foot', 'toe', 'shaft']
                 + [hand.thumbPart(k) for k in std.range(0, hand.thumbBones - 1)]
                 + [hand.part(finger, k) for finger in hand.fingers for k in std.range(0, hand.phalanges - 1)];
local slots = import 'models/worn-slots.libsonnet';
// The slot map is content keyed by those names, so a segment it misses or a key that names no segment is reported
// here rather than when some shell first lacks a slot.
local unmapped = std.setDiff(std.set(segments), std.set(std.objectFields(slots)));
local unknown = std.setDiff(std.set(std.objectFields(slots)), std.set(segments));
assert unmapped == [] && unknown == [] : 'worn slot map: segments with no slot %s, keys that are no segment %s' % [unmapped, unknown];
// A worn piece's id taken apart, `<garment>_worn` or `<garment>_worn_<segment>`, or null for any other id: a name that
// merely holds the word is no piece. A segment is one word, or a digit bone's word and number, as `index_01`.
local isNumber(word) = word != '' && std.all([std.member('0123456789', c) for c in std.stringChars(word)]);
local isSegment(tail) =
  local words = std.split(tail, '_');
  words[0] != '' && (std.length(words) == 1 || (std.length(words) == 2 && isNumber(words[1])));
local pieceOf(id) =
  local at = std.findSubstr('_worn', id);
  local last = if at == [] then null else at[std.length(at) - 1];
  local garment = if last == null then '' else id[:last];
  local rest = if last == null then '' else id[last + std.length('_worn'):];
  if last == null || garment == '' then null
  else if rest == '' then { garment: garment, segment: null }
  else if std.startsWith(rest, '_') && isSegment(rest[1:]) then { garment: garment, segment: rest[1:] }
  else null;
local segmentOf(id) = pieceOf(id).segment;
{
  // The ground row of the garment a worn family is fitted for, whose authored title and finish the shells reuse, found
  // among the rows of the set file `rows` the kit names, so a kit's key holds that one set and not every set.
  groundRow(rows, id)::
    local found = [row for row in rows if row.id == id];
    assert std.length(found) == 1 : 'the set file the worn kit names holds no ground row `%s`' % id;
    found[0],
  groundTitle(rows, id):: self.groundRow(rows, id).title,
  // A worn piece's id taken apart, { garment, segment }, the segment null for a piece in the doll's piece part; null for
  // an id that is no worn piece. The tail is the id's segment, whatever it names: a carried piece worn over the jacket,
  // `<gear>_worn_jacket`, has `jacket`, which is a layer and no part.
  piece(id):: pieceOf(id),
  // `own` is the taxonomy of the garment the shells belong to; each shell adds its slot and fit.
  shells(own, rows):: [
    row + { taxonomy: taxonomy.over(own, { tags: { slot: [slots[segmentOf(row.id)].slot], fit: ['worn'] } }) }
    for row in rows
  ],
}
