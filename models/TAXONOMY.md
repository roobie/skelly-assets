---
read_if:
  - tagging models, or choosing a model's category, tags or keywords
  - adding or requesting a taxonomy term or keyword
  - changing how the showcase or a consumer groups and filters models
---

# Model taxonomy

Model ids name models, but they do not classify them: `lame_saber` is a fencing jacket and `sun_shield` a hard-hat
brim, though both names read as weapons. With thousands of catalogue rows and vehicle parts, the showcase's shelves
and filters need classification data written by an author, not guessed. That data also needs a fixed vocabulary.
Otherwise many people and agents tagging in parallel invent near-synonyms, and each filter splits into several.

This taxonomy is for browsing and finding assets. It is not Deadvox's gameplay inventory category, which decides
how a game treats an item. The two stay separate so that changing a shelf can never change gameplay.

## Category and tags

A model has one category, its shelf, so every model sits in exactly one place. Tags are terms grouped by facet,
and each facet answers one question: what it is made of, where it is worn, what body its vehicle has. A
filter on a facet then means one thing. A term carries its meaning, so a tagger can choose between two
terms by reading them and does not have to guess from usage.

A facet is many-valued because a model can be true of several answers at once. A model worn on two parts of the
body names both slots, and one found in a gym and in a home names both `place` terms, so a filter on either finds it.

Questions that vary independently get separate facets. A vehicle's body and its role are such a pair: a
police car and a military truck each combine one of each, so `vehicle-body` and `vehicle-role` filter apart
and combine freely. Within a facet, terms should not overlap, which is why a vehicle that is only damaged is
`crashed` and a total loss is `wrecked`.

## The vocabulary is semi-closed

`models/taxonomy.json` lists every category and every facet term with its one-line meaning. The build refuses
a term that is not in the list. Adding a term is still a one-line data edit, because the list has to grow with
the content.

Tagging agents never edit the vocabulary. A tagger that finds no fitting term requests one in its report: the
facet, the term, its one-line meaning, and the models that need it. The main session reconciles those
requests. It merges synonyms, prefers an existing term where one fits, and adds the survivors in one
commit before the tags that use them. A single owner keeps the list small and orthogonal, and requests from
parallel taggers never race on the file.

## Keywords are open by review

Facets answer fixed questions, so a search needs words that no facet asks for: what a thing is also called, what it
is used for, what it belongs with. A model may carry `keywords`, a list of kebab-case search words. A closed list
would stall every new model on a vocabulary edit for words that only help a search, so keywords are admitted by
review instead. `models/taxonomy.json` lists each curated keyword with its one-line meaning, so a reviewer can tell a
new concept from a synonym of a listed word; a well-formed keyword not on that list is reported by the check and the
build, never failed, and the reviewer adds it to the list or asks for a listed synonym. A malformed keyword still
fails, because a search can only match the one form. The reported list is how the curated list grows without a single
owner reconciling every word first.

## Defaults and overrides

A set, kit, recipe or mob sheet can set a default that its rows inherit. Each row can override it. The row's
category and keywords replace the default's. Each facet the row names replaces that facet's terms, and the facets
it leaves out are inherited. Replacing a facet, rather than adding to it, lets an override drop an inherited term
(an empty list clears the facet).

Put a tag where its fact lives. What an object is (its material, the slot it is worn in) goes on the
catalogue row. How a pack uses it (its whole pack is weapons, every part belongs to one vehicle) goes on the
default that wraps the rows. What a whole vehicle is beyond its body, such as an ambulance's role on a van body, goes
on the vehicle's placements file and adds to the body's tags rather than replacing a facet, because the body's
terms stay true of the vehicle; see `docs/decisions/0001-vehicle-placements.md`. Jsonnet sources use `tools/jsonnet/lib/taxonomy.libsonnet`, `inherit`, and the mob
sheet uses `tools/taxonomy.mjs`, `inheritTaxonomy`. A shared case table in `tools/test/taxonomy.test.mjs` holds
the two to the same rule.

## The gate turns strict pack by pack

Every model must have a category, except in the packs that `untaggedPacks` lists. A listed pack becomes an
error once all of its models are tagged, or once it no longer exists, so the list can only shrink. A single
switch would have stayed off until the last pack was tagged, and new packs would have landed untagged. With the
list, every finished pack is locked in, and a pack that is not listed is strict from its first model. When
the list is empty, the key goes and the gate is fully strict.

`tools/check-sources.mjs` prints the untagged models and every problem; its `--json` output is for tagging
agents. `tools/build.mjs` runs the same report and fails before it writes any model.

## The manifest is the authority

The build writes each model's category and tags into its `built/manifest.json` entry, and consumers read them
from there. They are not copied into GLB extras: that would give the taxonomy two authorities, and every
retag would change the bytes of a model whose shape is the same.
