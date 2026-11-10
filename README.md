---
read_if:
  - adding a model, choosing its content pack or consuming shared assets
  - renaming or merging a model id, or moving a pin past renamed ids
  - which way a model faces, or whether a consumer converts its axes
  - understanding asset ownership, turned-piece appearance or actor clip contracts
  - labelling a packaged model's print, or drawing labels in a consumer
  - adding or applying the catalogue's item drafts
  - bumping the Node version, or why CI and builds pin one exact version
  - opening a PR or cutting a release, and where its change notes and release notes come from
---

# skelly-assets

3D game assets and the pipelines that build them: mobs with their animation clips, worn armour and clothing,
weapons, tools and other props. Every model is generated from source: models are Jsonnet rows and mobs are
seeded generator rows, and a build turns both into binary glTF (`.glb`).

CI builds them and publishes each version as a release, so you can use the assets without building anything.

**Browse them:** <https://roobie.github.io/skelly-assets/>: turn each model around, play the creatures' clips
and download any of them.

## Layout

A model either product uses is produced once in this repository, from one source row by one builder, and
emitted once at `built/<packId>/<logical path>`. Every consumer reads that same path. A product need not bundle
every pack: sharing is a capability, not an obligation to load the whole library. A product that wants a model
bundles its pack and reads the same bytes as every other consumer. Keep no hand copy beside a producer and give
models a producer rather than preserving unbuildable copies. These rules serve one shared asset database and
pipeline for a vast library of models and rigs, usable homogeneously by deadvox and arpg1.

### Choosing a pack and source

Every directory directly under `built/` is a content pack id, never a directory chosen merely for its reader.
A product-named home makes sharing require another product's name. Group one coherent kind of content per pack:
a modern carbine does not belong with sci-fi bolt guns, nor ordinary clothing with powered armour. Keep these
families separate even when the same tool builds them. Pack declarations and path boundaries are cued by
`tools/layout.mjs`, `declaredPacks` and `outputPath`.

For a new gun or thing, select its source in `models/recipes/<packId>.jsonnet`, choosing the pack by content,
not by which game requested it. Keep one recipe file per pack, with owning tool selected by each row's kind;
see `tools/recipes.mjs`, `readRecipes`, and `tools/build.mjs`, `partitionRecipe`. This lets a pack combine gun
and thing exports without giving a model two producers. The recipe schema and tool boundaries are in
`tools/packages/thing-export/src/recipe.ts`, `RowSchema`,
`tools/packages/gun-authoring-tool/src/cli/exportRecipe.ts`, `GUN_KINDS`, and
`tools/packages/thing-authoring-tool/src/exports.ts`, `THING_KINDS`.

A thing recipe or roster row selects a catalogue row, not a second model source. Author thing sources in the
model files that `models/index.libsonnet` lists; `tools/packages/thing-authoring-tool/items.jsonnet` joins them to
the shared settings for the thing tool. Rows and every value an author tunes, such as masses, measures and finishes,
live under `models/` because that tree carries the content licence (`REUSE.toml`); `tools/` keeps only the builder
functions, which are code. The roster filters that catalogue through
`tools/packages/thing-authoring-tool/exports/deadvox.jsonnet`, `roster`, using `models/export.json` as the
authority for which families use the roster; see `tools/layout.mjs`, `readRoster`, and `tools/build.mjs`,
`buildRoster`. Do not select those models again in a recipe. For guns, author the source named by the recipe
row's `source`; file-backed sources resolve relative to the repository root, while other gun kinds select their
source through the owning exporter. See `tools/recipeTools.mjs`, `loadRecipeTools`, and
`tools/packages/gun-authoring-tool/src/cli/exportRecipe.ts`, `loadExportRecipe`. The firearms pack's guns, cartridges,
attachments and magazines are listed in `models/guns/roster.libsonnet`, so adding one is a content edit; the code that
turns each entry into its recipe row is `tools/packages/gun-authoring-tool/exports/deadvox.jsonnet`.
A vehicle is authored as its own file of part rows in `models/vehicles/`, beside the kits that press its panels
from its measures, so parallel authors each add files and none edits a shared list. A recipe selects whole
vehicles, never single parts, so a vehicle's own parts all live in one pack, and a part it borrows from another pack
comes through a declared pack dependency, never a copy; road vehicles, helicopters and wrecks
are separate packs because a product can want traffic without aircraft or ruins. A vehicle's file sets the
taxonomy default for its rows, so the whole vehicle is tagged in one place. The index that lets the catalogue
import those files is generated; see `tools/row-index.mjs`, `rowIndex`, and
`models/recipes/skelly.ground-vehicles.jsonnet`. A vehicle drives on the ground unless another pack claims it, so a new
road vehicle needs no recipe edit; see `models/vehicles/packs.libsonnet`, `vehicles`. Which part sits where on a
vehicle is model data too, in the vehicle's placements file beside its rows, so the showcase and the games assemble it
from one source; why, and what stays gameplay, is in `docs/decisions/0001-vehicle-placements.md`. A vehicle fits its
engine, turret, radiator or fuel tank either fused or as a core with salvageable fittings; why is in
`docs/decisions/0004-assemblies.md`. Its wheels turn whole at their sites, with a brake disc and caliper at sites of
their own; why is in `docs/decisions/0005-wheel-assemblies.md`. A track is a band of links with its sprocket, idler
and road wheels at sites of their own, in size classes; why is in `docs/decisions/0006-track-assemblies.md`. An
exhaust is fused or split along its run into salvageable parts; why is in `docs/decisions/0007-exhaust-assemblies.md`.
Ordinary world items are authored the same way, as set files of rows in `models/catalogue/sets/`. A set is an
authoring unit, not a pack: each row's category chooses its pack, so a pack stays one shelf a product can load
whole and a new set needs no recipe edit. See `models/catalogue/packs.libsonnet`, `byCategory`.

The item drafts in `models/catalogue/drafts/` are Deadvox gameplay data for the catalogue models: what each
thing is called, carries, protects and does in play. They wait here until skelly's framework refactor gives item
content its new layout, and are applied then. Each set's drafts sit in a file named after it, so a draft is found
beside its model. Several items may share one model when they differ only in colour, grade or size. The values
are our own: the catalogue was drawn against another game's item data, whose share-alike licence and database
rights would follow a copied table, so drafts keep no link to it and leave out the fields that matched it value
for value until they are derived from our own models. See `tools/test/catalogue-drafts.test.mjs`.

For a generated creature, author a row with its content pack in `models/mobs.json` instead of a gun/thing recipe;
see `tools/layout.mjs`, `readMobRows`, and `tools/mobs.mjs`, `exportMob`.

Every model also needs a category and may carry facet tags, from the vocabulary in `models/taxonomy.json`.
The build refuses a model without them in a strict pack. Why, and how to request a term, is in
`models/TAXONOMY.md`; `node tools/check-taxonomy.mjs` lists what is still untagged.

### Outputs and consumers

The no-id production run of `tools/build.mjs` is the roster and recipe entry point: it writes each model under
its pack, with the owning tool's metadata and, for things, an index for consumer admission. Cue the output
contract rather than maintaining a second file list: `tools/build.mjs`, `exportRecipes` and
`PRODUCTION_RECIPE_TOOLS`, and `tools/packages/thing-export/src/files.ts`, `writeRecipeExports`.

Every model file is written in glTF's frame, so a consumer imports it without converting axes; why, and the frame, is
in `docs/decisions/0002-model-frame.md`.

Generated actors have a GLB plus a body and pose clips, not a second consumer-specific bake; see
`tools/layout.mjs`, `readMobRows`, and `tools/actorBake.mjs`, `bakeActor`. Every consumer reads the body and pose
files in the one shared representation, in the model frame: roots and quaternion rotations must agree, and consumer
facing conventions must not become a second baked rig. Mobgen authors figures facing -z and the export turns every
baked value once, so its authored signs stay as they read; see `tools/actorFrame.mjs`, `fileBody` and `fileClips`.
Consumers compose with `tools/actorCompose.mjs`, `decodeFrame` and `sampleClip`.

A consumer reads pack paths from the manifest and bundles the packs it needs, with the packs each of them depends
on, so a pack that refers to another's models never loads without them; see `models/packs.json`. Which packs a product bundles is
that product's choice, recorded in its own repository rather than copied here, so this repository never has to
follow a product's selection. A standalone model does not require a playable item or placement, so a pack can
carry looks one product uses without inventing gameplay for another. Packs are scoped to content, such as a kind
of thing, an actor family, a site or a scenario, never to a reader; see the selections in `models/recipes/`. The
showcase consumes all manifest models, independent of product bundling, and shelves and filters them by the
category and tags their manifest entries carry; see `site/build.mjs`. It shows each vehicle assembled from its
placements, because a pile of loose panels does not show what the vehicle is, and can explode it to show the parts
it is made of.

Use `manifest.json` as the consumer-facing file authority, not a parallel list in documentation; see
`tools/manifest.mjs`, `buildManifest` and `mobManifest`. Credits come from `REUSE.toml` through
`tools/manifest.mjs`, `readCredits`. Nothing sits flat beside the manifest, so every file belongs to a pack a
consumer can choose to bundle. CI holds every build to its manifest and to the declared packs before it is
shown or released; see `tools/check-built.mjs` and `tools/manifest.mjs`, `treeDifferences`.

Renaming or merging a released model id adds the old id to `models/renames.json`, pointing at its current id, and
repoints any entry that named it, so a consumer's saved ids keep resolving after it moves its pin. The build refuses
a map whose retired id names a model again or whose target is no current model; see `tools/manifest.mjs`,
`buildManifest`.

A cue into a product's source names the product and the symbol, with no path: deadvox's `typeWeightGrams`, not a
path to the file that holds it. A reader of this repository alone cannot resolve a path into skelly, and skelly moves
files, so a path cue goes false while a symbol cue survives the move. The cues name skelly symbols as they stand on
the skelly revision that pins this release. Nothing checks them, so a renamed symbol goes stale without a failure. A
path cue may come back if this repository gains a cue check over a skelly checkout.

### Printed labels

A packaged item without its print reads as a blank box, so a catalogue row can name the face of a piece that
carries its print and the text, which defaults to the model's display name. The label travels as metadata beside
the GLB, never as lettering in its geometry: each consumer draws text in its own renderer and font, and relabelling a
row leaves the model's bytes alone. See `tools/packages/thing-authoring-tool/src/catalogue.ts`, `ItemSchema`, and
`tools/packages/thing-core/src/schema.ts`, `NeutralModelSchema`; the showcase draws it in `site/app.js`,
`printedLabel`.

### Shared turned look and fit limits

Turned pieces inherit the catalogue's shared faceted default so both products render the library consistently.
Authored numeric side counts override it; a compound piece can explicitly choose round with `sides: null`.
A large side count is still a polygon, not the round mechanism. Keep the default in content, not a tool-code
number, so authors retain control without forking the builder. See
`models/item-settings.libsonnet`, `turnedSides`,
`tools/packages/thing-authoring-tool/src/catalogue.ts`, `buildPart`, and
`tools/packages/thing-authoring-tool/src/families/compound.ts`, `compound`.

The worn family fits the shared player body, not generated mobs. Fitting garments over generated bodies requires
its own development round; sharing a model does not imply universal fit. `paper_sheet` and `folded_note` remain
outside the shared producer guarantee: they have no producer, and closing that gap requires its own ruling.

For pipeline ownership and authoring entry points, see `tools/README.md`.

## Using the assets

Fetch a pinned release rather than building or tracking this repository: from a `v*` release, download
`manifest.json` and the `<packId>.tar.gz` of each pack you bundle. Each archive holds its pack's tree under
`<packId>/`, and every manifest path is logical under its pack, so the archives unpacked side by side form the
same tree for every consumer. Pinning a tag gives you immutable bytes that only change when you move the pin;
fetching per pack keeps sharing a capability rather than an obligation to take the whole library.

When you move the pin, map every model id you saved through the release's `renames.json`, the manifest's `renames`.
It holds every id any earlier release retired, renamed or merged into another model, mapped to its current id, so a
jump over several releases is one lookup; a retired id never names a new model, so the lookup is never ambiguous.

A vehicle site's `finish` names an entry of the release's `finishes.json`, the manifest's `finishes`: the glTF
material a painted surface in that finish carries. Why the library ships and how a copy takes it is in
`docs/decisions/0003-vehicle-paint.md`.

The `.glb` files load in any engine or tool that reads glTF 2.0. Engine-specific sidecar files, such as Godot's
`*.import`, are ignored here, so each game generates its own.

## Releases

Pushing a `v*` tag publishes the release that consumers pin (see "Using the assets"). CI builds every release from
source; see `.github/workflows/assets.yml`, `release`, and `tools/pack-release.mjs`, `packRelease`. Binaries
committed to git grow its history with every rebuild, cannot be merged and can drift from their source; a release
pins the bytes immutably, with CI as their one producer. CI builds the tree twice and holds the builds to each
other, so a release is known to be reproducible from its tag. A tag's two builds are both clean, uncached, because
nothing short of that proves the release reproduces.

Each release's notes, also kept in `CHANGELOG.md`, say what moving a pin to it changes, breaking changes first, so a
consumer can upgrade without reading the code. Every PR adds its own change note for them; see `changes/README.md`.

A PR reuses cached exports of the models it leaves unchanged, so its CI time follows what it changes rather than
the size of the catalogue. Every model it changes is still generated by both builds, each from its own cache, so
the two stay independent. The cost is that a model whose cache key misses an input it reads shows stale bytes in
that PR's build; the merge to main catches it, because every build outside a PR has one clean copy, and nothing is
published until the two agree.

Each copy spreads its model generation over several runners and builds its tree from their merged caches, so a
clean copy no longer waits on one runner generating the whole catalogue. Sharding
the cache rather than the tree keeps every copy built by the one build entry, and a cache hit returns what its
generation stored, so the tree is the one an unsharded build makes; see `tools/build.mjs`, `fillCacheShard`.

Every push to main also replaces the `edge` pre-release with that commit's build, so the latest main stays
fetchable after CI's build artifacts expire. `edge` is unpinned and moves on every push; it is never marked
latest, and a consumer pins a `v*` release instead.

## Building

You need the Node version named in `.node-version`; see "Node".

```sh
tools/build_models.sh            # complete roster and recipe build
tools/build_models.sh <id> ...   # only some rows
tools/build_mobs.sh              # every mob in models/mobs.json
node tools/build-all.mjs --out <dir>   # the complete tree, as CI builds it
```

The first run installs the tools' npm dependencies and downloads a pinned, checksum-verified go-jsonnet. Builds
write to `built/`, which git ignores: commit only the source, and CI builds and checks the output. A build reuses
every model whose source and generator code are unchanged, so a rebuild costs what an edit reaches rather than the
whole catalogue; see `tools/generation.mjs`, `DEFAULT_CACHE`. More detail is in `tools/README.md`.

To preview the showcase locally, build the complete tree into `built/`, run `node site/build.mjs` and serve
`_site/` with any static file server.

### Node

Every build, local and in CI, runs the one exact Node version in `.node-version`, so a bump is one edit there.
An export's cache key includes the Node version (see `tools/packages/thing-export/src/cache.ts`,
`codeFingerprint`), because different Node can produce different bytes; under a floating major every patch release
would therefore regenerate both of main's copies from scratch, while a pinned version invalidates the cache only
when it is bumped. A floating major also makes every CI job download Node from GitHub's release hosting, whose
failures and retries can cost a job over a minute; an exact version is restored from the runner's tool cache
instead. See `.github/actions/node/action.yml`, `Cache Node`.

### Showcase idle motion

The showcase shows a humanoid idle's rest pose rather than sway. The three sway oscillators in
`tools/packages/mobgen/src/mob/idle.ts`, `idleMotion`, only close a plain baked loop over a span too long for the
showcase; a short loop visibly jumps at its wrap. The showcase carries no composition logic, so it uses the rest pose.

## Licence

The licence depends on the path; [`REUSE.toml`](REUSE.toml) states it for each one.

- **Models, their sources and the built output** (`models/`, `built/`):
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). You may use, share and adapt them for
  non-commercial purposes, with attribution to Björn Roberg, and you must share adaptations under the same licence.
  For a commercial licence, contact the author.
- **The pipelines and the showcase page** (`tools/`, `site/`): [EUPL-1.2](LICENSES/EUPL-1.2.txt).

The full licence texts are in [`LICENSES/`](LICENSES).
