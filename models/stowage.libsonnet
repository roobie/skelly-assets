// Stowage: the slots a locker part offers and the seat a stowable item stows by; the why is in
// docs/decisions/0016-stowage-slots.md. A word names a kind of kit and how it seats, so any item of one word takes
// another's place in a slot that accepts it.
local mount = 'stowage';
// How an item of each word is seated, which every item and slot of the word follows. Resting kit seats at the middle
// of what it rests on, its normal down and its up toward its front; a slot it rests in faces up out of its floor or
// shelf, its up out of the locker, so the kit faces out and lies along the locker's length.
local words = {
  bottle: 'an upright bottle or cylinder, resting',
  case: 'a box or case standing on its base, resting',
  sheet: 'a folded sheet, resting',
  'hose-roll': 'a rolled hose standing on its rim, its face to its front, resting',
  bar: 'long kit lying along the locker, resting',
  cone: 'a traffic cone, resting',
  machine: 'a machine on its own frame or foot, resting',
  // Hung kit seats on the face it hangs against, its normal into the board and its up toward its head; a slot it
  // hangs from faces out of the board, its up vertical.
  'hung-tool': 'a long-handled tool hung head up flat against a board',
};
local word(name) =
  assert std.objectHas(words, name) : 'stowage word %s is not one of %s' % [name, std.join(' ', std.objectFields(words))];
  name;
{
  words:: words,
  // The male port an item stows by, at `pos` in its source frame.
  seat(name, pos, normal, up): { id: 'stow', mount: mount, gender: 'male', standard: word(name), pos: pos, normal: normal, up: up, required: false },
  // The seat of resting kit at `pos`, the middle of its base, its front on `front`.
  resting(name, pos, front=[0, 0, 1]): self.seat(name, pos, [0, -1, 0], front),
  // A row given its seat, on its first part.
  stows(seat): { parts: [super.parts[0] + { ports+: [seat] }] + super.parts[1:] },
  // A slot `id` in a locker part: the words it accepts and the envelope, in its frame, its kit must stay inside.
  slot(id, accepts, pos, normal, up, envelope): {
    id: id,
    mount: mount,
    gender: 'female',
    accepts: [word(name) for name in accepts],
    envelope: envelope,
    pos: pos,
    normal: normal,
    up: up,
    required: false,
  },
}
