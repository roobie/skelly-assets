---
read_if:
  - authoring a vehicle locker, shelf or load space whose kit a game can take out or put back
  - giving a catalogue item a stowage port, or choosing the word a slot accepts
  - reading a part's stowage slots or a site's load-out in a consumer, or placing stowed kit on a mirrored site
  - changing the stowage checks in `tools/stowage.mjs`
---

# 16. Stowed kit is catalogue items in slots, not pieces of the locker

## Context

A locker's kit was drawn as pieces of the locker's stowage part, so it came out only with the whole locker. A game
could not loot one extinguisher, leave the rest, or put a found halligan back; and kit drawn into a locker was a
second, cruder model of something the catalogue already had. A consumer that wants kit to be things needs to know
where each thing goes, what may go there and how much room there is, without reading the locker's pieces.

## Decision

A locker's stowage part keeps its fit-out (shelves, boards, straps) and declares **slots**: ports with mount `stowage`,
exported on the part's GLB as port nodes as `docs/decisions/0009-component-mounts.md` does every port. A slot carries:

- an **id**, stable across releases, since a save names the slot an item was taken from;
- a **frame** (position, normal out of the surface the item rests on or hangs from, and up);
- an **envelope**, the box in the slot frame that whatever is stowed there must stay inside;
- **accepts**, the words of what it holds.

A stowable catalogue item declares one male `stowage` port whose `standard` is its word, at the point it rests or
hangs by. An item fits a slot when its word is one the slot accepts and its bounds, mated, stay inside the envelope.
The item meets the slot as any port meets its mate: its normal against the slot's, its up along the slot's. Items
that share a word share the seat convention (`models/stowage.libsonnet`, `words`), so any of them can take another's
place.

A vehicle site of a part with slots names its **load-out**, `stowed`, slot id to item model id: what the vehicle
holds when it is spawned. After spawn the contents are the game's state; the asset says only what fits where and
what was there to begin with.

A far-side twin's part is reflected, but an item is a real thing and is never reflected: on the far twin it stands
at the reflected point turned half a turn about the vertical. So the turned envelope must be the reflected one,
which holds when each envelope is centred on its slot along the vehicle's length; the check holds every slot to it.

A stowage site may name `behind`, the site of the closure that hides it, so a consumer can skip drawing kit behind
a shut door; the closure must have a motion, or the kit would be hidden for good. Kit uses the item's own model; a coarser one waits for a measurement that needs it.

The build refuses a slot whose envelope reaches into another's or into the part's fit-out, and a load-out whose
item does not exist, is in a pack the vehicle's does not depend on, has no word the slot accepts or does not fit;
see `tools/stowage.mjs`. The fit allows nothing past the envelope, since a shutter clears only what stays inside.

## Rejected options

- **Baked kit in named groups a game hides:** kit could only ever be taken out, never stowed, and the baked look, the
  loot item and the table pairing them would be three copies that drift.
- **Slots and items near, a fused baked load-out far:** two drawings need an equality test, the far one shows a
  looted locker as full, and far kit is mostly behind its shutter or a few pixels anyway.
- **A fixed list of item ids per slot:** a new item would need every slot that could hold it edited, where a word and
  an envelope take any kit that fits, from any pack or mod.
- **Shelves and boards in the body part:** they belong to the locker the kit stows in, so they stay with its slots
  and the fit check they face, and a body without lockers keeps no orphan shelves.
- **A separate coarse stowed model per item:** a second drawing of each item drifts from the first; a coarser one
  waits for a measurement and, if made, serves every use of the item, not only stowage.
- **Always drawing stowed kit:** kit behind a shut shutter costs draws and shows nothing; `behind` lets a consumer
  skip it, and whether it does is the consumer's call.

## Consequences

- A consumer composes a vehicle's kit from the load-out and the item models it already loads, and can move each item
  in and out on its own; the showcase draws the load-out the same way (`site/build.mjs`, `stowedSites`).
- A new kind of stowed kit is a catalogue row with a stowage port, reusable by every vehicle, rather than pieces
  drawn again for each locker.
- The packs that hold stowable items are dependencies of the vehicle packs that stow them.
- A slot id is a contract: renaming one breaks every save that took from it, so it changes only with a breaking note.
