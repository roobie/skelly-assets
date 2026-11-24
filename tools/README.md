---
read_if:
  - building models or sounds, or adding source-backed per-pack export recipes
  - understanding package origin and the boundary between tools and game consumers
  - reviewing how models or assembled vehicles look, as pictures, contact sheets or a vehicle gallery
  - changing how a vehicle, a kit assembly or a model built of components comes apart in an exploded view
  - choosing which unreviewed rows to review first
  - adding a tools package, or changing a package's TypeScript compiler options
  - typing a tools module, test or showcase module, or importing one from TypeScript
---

# Model tools

Build sources into `built/` to inspect them; commit only the sources, because CI builds, checks and releases the
output so consumers need no authoring environment. Use `build_models.sh` for roster and recipe exports, and
`build_mobs.sh` for generated actors. For the entry points and selection rules, see `build.mjs`, `main`,
`mobs.mjs`, `main`, and `sounds.mjs`, `main`.

The Node version in `.node-version` runs TypeScript directly; see `README.md`, "Node". Every package's
`tsconfig.json` extends `tsconfig.base.json` and adds only what is its own, so a strict check is turned on once for
every package instead of drifting between copies. The tools' own JavaScript, their tests and the showcase carry their
types as JSDoc in the source, checked by `tsconfig.json` here under the same base, because a hand-kept declaration
file beside a module drifts from it; see that file's header for how a module opts in. Install the locked dependencies with `npm ci` in `tools/`;
`node tools/jsonnet/setup.mjs` and `node tools/sources.mjs`, run from the repository root, prepare the pinned
compiler and Jsonnet twins before parallel tests. Generated twins stay ignored so Jsonnet remains the source
of truth; see `sources.mjs`, `installJsonnetSources`. Every package pre-script asks for the twins, and the
catalogue is costly to compile, so a refresh recompiles only what an edit reaches; see `sources.mjs`,
`refreshJsonnetTwins`. A row file is keyed by its import closure, found by scanning the import literals rather than
evaluating, so an edit invalidates exactly the files that can see it. Every row file compiles on its own into a
fragment and the heads of its rows, in parallel. A twin is not
keyed by the row files it reads but by the digest of what stands in for them, so an edit that leaves a fragment as it
was recompiles no twin: the scan of its closure stops at a row file and at `models/catalogue/heads.libsonnet`, which a
compile replaces by the heads of every row file. The heads are the six fields of a row that packs, recipes and the
Deadvox export read, so a geometry edit reaches the items and no recipe; see `jsonnet/heads.libsonnet`. Only a library path
mirrored by the overlay sees what a compile stands in for, so a file imports a stood-in file by its plain
root-relative path and the scan refuses any other way to it (from beside the importer, by an absolute path, or through
a `..`), because the compile would read the file itself under a key that holds the stand-in's digest. A row file added
or deleted changes the heads' digest, so it reaches every twin over the heads. CI keys its store by the digest of every
input's whole closure, because it names the store before any fragment exists. Every row source is a row file: the
catalogue sets, the vehicles, and the code-built kits in `../models/kits/`, each a list of finished rows, so that the
catalogue is their rows in path order and `models/` itself holds no row sources; see `row-index.mjs`,
`catalogueIndex`. A row file that imports another, as a worn kit imports the one set file whose ground row it reuses
instead of scanning every set, compiles over that file's fragment, so a set's edit recompiles the set and the kits that
name it and no other kit; see `sources.mjs`, `compileFragments`. The stale twins compile in parallel
processes over an overlay that puts the fragments in place of the row files: an edited row file costs its fragment and
the twins over it, not every row again, and a twin over the heads evaluates no row. A twin is written only
when its bytes differ from the file on disk, so an edit that leaves a recipe's output as it was leaves the file and its
mtime alone, so a watcher of the twins sees only what changed. CI
jobs start from fresh checkouts, so they share compiled units through a content-addressed twin store restored from the
latest run.
A fresh worktree is a fresh checkout too, so worktrees and users on one host can share a store the way they share the
export cache: `JSONNET_TWIN_STORE` names its folder, and a setgid, group-writable folder keeps every entry some
checkout's refresh used within an entry life rather than only the entries of the checkout that refreshed last. The
root itself must be `2775`, since its bits decide sharedness for every kind folder in it, and a kind folder made
before the root was shared needs the same, or the group could not write there; `entryFolder.mjs` fails naming the
`chmod` rather than at another user's first write. A shared entry is served to every checkout on its inputs, so a
refresh stores a unit only if its files still hold the content it was keyed by once the compile has read them: the
compiler reads them again after the refresh took their keys, and an edit in between would otherwise put one content's
twin under another's key.
The catalogue's settings (units, facets, turned sides, default material) have a twin of their own, since a consumer of
them alone, such as the build's finish library, must not load and check every row; see
`thing-authoring-tool/item-settings.jsonnet` and `src/settings.ts`.
The catalogue's rows are not a twin at all but a file for each row, `thing-authoring-tool/items/<id>.json`, and a
manifest of their ids in catalogue order, `item-ids.json`, both written from the stored fragments with no Jsonnet
evaluated. The manifest groups the ids by the row file that makes them, so the dev server evaluates a viewed row from
that one file rather than from the whole catalogue, whose every row is built to read its id. One 40 MB file made every reader parse the whole catalogue and every edit rewrite it, while a reader wants one
row or a few and an edit reaches one or two. A row's file is written only when its bytes change, so a geometry edit moves
the files of the rows it reaches and nothing a dev server watches but those. The manifest, not the folder, says which
rows exist, because a refresh races its readers: it is written after the rows and before the sweep of the files it does
not list, so a reader sees the catalogue half way between two refreshes but never a file half written. The manifest
also records the fragment each row file's rows were written from, because the twins' stamp follows twins and a checkout
of another branch moves it without touching the folder; a missing row file is written again for the same reason. A row's
id is a file name, so two row files holding one id, or an id of anything but the thing id's letters, digits and `_`,
fail the refresh naming the row file; see `catalogue-rows.mjs`,
`writeCatalogueRows`, and `thing-authoring-tool/src/cli/content.ts` for what Node code reads, which is the rows it names.
A row file must be plain data, because its fragment is its manifested JSON: a hidden field, a function or a
late-bound `self` that an importer extends would differ from the source, so anything else belongs in a library,
and a kit builds its rows from one and exports them finished. Each fragment compile holds its row file to that, failing
with the file and field, because the difference would
otherwise build silently and a mod's row file should fail where it is written; see `jsonnet/plain-data.libsonnet`,
`rows`. Jsonnet imports another source's `.jsonnet`, never its twin, because stale twins compile in parallel and none
exists in a fresh checkout until they end. The compiler is checksum-verified; transient release
hosting failures are retried rather than failing every Jsonnet build. See `jsonnet/setup.mjs`, `downloadWithRetry`.

## Origin

These packages are maintained here as the shared producer, not as game-local exporters. The origin reference
for each package is skelly commit `aee7ab265525f55247b88d9482e7109af44eaf42` (EUPL-1.2), with the retained
content noted below. Shared package ownership avoids parallel game-local producers.

### construct

`packages/construct` originates at the reference commit, with its tests. Geometry mechanisms belong here rather
than in consumer-specific builders, so shared shapes have one mesh and collision contract.

### thing-core

`packages/thing-core` originates at the reference commit. Its material table, `../models/finishes.jsonnet`, retains the
assets catalogue and arpg1 materials, so adopting shared schemas does not discard authored finishes. Parameterised firearm and vehicle
schemas keep game-owned temporal brands outside the tool pipeline.

### surfaces

`packages/surfaces` is the assets' own. Bark and leaf shaders ship as edits to three's programs, so a game keeps its
own materials; see its `README.md`.

### thing-export

`packages/thing-export` originates at the reference commit, with its tests. Neutral export and file writing live
here so the authoring tools share an output contract rather than copying writers.

### tool-ui

`packages/tool-ui` originates at the reference commit, with its tests. Shared editor UI is tool-owned, not a
reason for authoring packages to depend on a game.

### gun-authoring-tool

`packages/gun-authoring-tool` originates at the reference commit, with its tests. Schema-based export tests
belong here; admission into a game's content registry remains the consumer's responsibility.

### vehicle-authoring-tool

`packages/vehicle-authoring-tool` originates at the reference commit, including the editor/schema tests. Its
blueprint inputs are content, in `../models/vehicle-blueprints/`. Validation here is schema-only: consumer admission
and runtime behaviour remain game-owned.

### thing-authoring-tool

`packages/thing-authoring-tool` originates at the reference commit, reconciled with the compound/worn-fit helpers
and selected catalogue content from skelly commit `56b9b69a6c1c965a31f4fbb66270e2ed0421cdc9`. The retained armour
needs `packages/thing-authoring-tool/worn-fit.libsonnet`, `oct`. Authored side counts and the catalogue default preserve authoring
control; see `../README.md`, "Shared turned look and fit limits". Container masses are copied into
`models/measures/container-masses.libsonnet` so a model build does not import a game's item rules. The viewer,
fixture exporter and tests belong to this producer.

### mobgen

`packages/mobgen` originates at the reference commit, reconciled with the assets-specific signature parts,
budgets, idle stance and additional body plans. The viewer, CLI, tests and docs belong to the generator,
while the templates, palettes and clips a modder tunes are content in `../models/mobs/`; ragdoll physics belongs to the consuming game, not the asset bake.

## Layout

Choose pack ownership before choosing an exporter; the shared rule and consumer contracts are in
`../README.md`, "Layout". A pack's recipe is `../models/recipes/<packId>.jsonnet`. Discovery follows source
files, not stale JSON twins; see `recipes.mjs`, `readRecipes`. The common row schema is
`packages/thing-export/src/recipe.ts`, `RowSchema`.

Keep one recipe driver so tool ownership is checked before either loader runs. See `build.mjs`,
`partitionRecipe` and `exportRecipes`, for kind dispatch and duplicate-producer refusal; the owning boundaries
are `packages/gun-authoring-tool/src/cli/exportRecipe.ts`, `GUN_KINDS`, and
`packages/thing-authoring-tool/src/exports.ts`, `THING_KINDS`. Gun source paths resolve against the
repository root, not a game's checkout, so a recipe can name gun content under `../models/guns/`; see
`recipeTools.mjs`, `loadRecipeTools`.

Use the production entry for the complete roster/recipe set, not a tool-local refresh into a consumer tree.
See `build.mjs`, `main`, `buildRoster` and `PRODUCTION_RECIPE_TOOLS`. Output paths and metadata/index writing
are owned by `packages/thing-export/src/files.ts`, `writeRecipeExports`; pack containment is owned by
`layout.mjs`, `outputPath`. For a thing-only recipe export into an alternate output root, see
`packages/thing-authoring-tool/src/cli/export.ts`, `exportThingRecipes`.

Building modules additionally reference kit definitions. The production driver calls `buildingKits.mjs`,
`exportBuildingKits`, to validate the written sidecars and ship those documents, including on targeted builds.
Low-level `exportRecipes`/tool-local writers do not by themselves produce a complete building-metadata tree;
callers also export the kits and pass their file accounting/registry to `buildManifest`. See the
[building contract](../docs/building-metadata.md) for frames, qualified joins and forward-compatible reader rules.

Generated actors are a separate source family, not another recipe partition. A mob row selects a registered
template and body-plan pose mechanism; see `mobTemplates.mjs`, `templateFor`, and `mobs.mjs`, `exportMob`. The GLB,
body, pose clips and genome form one consumer contract; see `layout.mjs`, `readMobRows`, and `actorBake.mjs`, `bakeActor`.
Use this same representation for every reader so changing a rig does not require parallel consumer-specific encodings.
The parts a cut leaves are baked from the same bodies rather than drawn, so a part always matches the stump it came
from and every cut point has one; see `severedParts.mjs`, `severedPartPlan`, and `severedPartBake.mjs`,
`bakeSeveredParts`.

The taxonomy is checked before anything is built, from the source rows rather than from the export tools, so
one report covers the roster, the recipes and the mob sheet alike, and the export tools only carry the field. See
`check-sources.mjs`, `modelSources`, and `build.mjs`, `withSources`; the why is in `../models/TAXONOMY.md`. The same
report holds each vehicle's parts at different sites clear of each other; see `siteOverlap.mjs`, `siteOverlaps`, and
`../docs/decisions/0014-site-overlap.md`.

Treat the manifest as the produced-file authority. See `manifest.mjs`, `buildManifest`, `mobManifest`,
`soundManifest` and `readCredits`, for model identity, actor companions, sound takes and attribution. `check-built.mjs` holds a fresh build to the
manifest and the declared packs (`manifest.mjs`, `treeDifferences`), so no produced file goes unnamed and no
declared pack goes unbuilt. CI hands the check two independent builds from `build-all.mjs`, `buildAll`, and
requires them byte-equal (`check-built.mjs`, `treeMismatches`), so a release built from a tag is known to reproduce
rather than assumed to. The smooth copies are held to the same fit checks only as a report, since those checks were
tuned to the voxel lattice; see `smooth-fit.mjs` and `../docs/decisions/0020-smooth-copy.md`. A build reuses
every export whose code and inputs are unchanged, so its cost follows what changed rather than the size of the
catalogue; see `packages/thing-export/src/cache.ts`, `entryStore`. Keys are the
content an export reads, not a dependency graph, so a kit or library edit rebuilds exactly the models whose compiled
rows it changes, and nothing has to be kept in step with the imports. A key that leaves out something an export reads
would serve stale bytes, so a tool caches only rows that name their inputs, data its code reads whatever the row
counts whole beside the code (`recipeTools.mjs`, `recipeTools`, and `mobs.mjs`, `mobStore`), and an over-wide key
costs only a miss. The code in a key is the import closure of the module that does the work, never a list kept by
hand, which misses the import nobody added to it; see `importClosure.mjs`, `importClosure`. The checks that cache
their results are keyed the same way, so a module that reads built models as bytes keeps the tool that built them out
of its imports, or every edit to that tool would cost the check again; see `dollParts.mjs`. A complete build prunes the entries it did not use, so the cache holds what the next build can
reuse rather than an entry for every edit ever built. Worktrees and users on one host can share a cache, since a
fresh worktree would otherwise regenerate the whole catalogue: `SKELLY_EXPORT_CACHE` names its folder, and a folder
that is setgid and group-writable is treated as shared. One build there cannot name the entries the other builds
still reuse, so a shared cache instead drops an entry no build has used for an entry life, and the cache gives the
group the access its owner has to whatever it makes, whatever each user's umask; see `entryFolder.mjs`,
`SHARED_ENTRY_LIFE_MS` and `prune`. The
determinism check builds uncached, since a check that read
the cache could not show the cache was right. A worker exports a
row from the task its tool hands it, the row with the slice of its sources the export reads, because loading the whole
item catalogue in every worker costs more than most exports; see `recipeTools.mjs`, `recipeTools`, and
`packages/thing-authoring-tool/src/exports.ts`, `thingTasks`. A thing row's slice gives it the inputs the whole
catalogue does, so its cache key does not depend on which side loaded it. Release archives are byte-reproducible for the same reason; see `pack-release.mjs`,
`packRelease`. The showcase reads this authority rather than maintaining its own model selection; see
`../site/build.mjs`.

Keep engine import caches in consumers; `.gdignore` excludes the authoring tree from Godot scanning.

The UAL doll's rest skeleton is measured once from Quaternius's mannequin, a third-party reference kept apart from the
models in `../models/references/`, so no later change re-reads a 7 MB GLB. `node tools/ual-skeleton.mjs` writes
`../models/dolls/ual/skeleton.json` from it, and `test/ual-skeleton.test.mjs` fails when either drifts.

## Review renders

Pictures let a reviewer, human or agent, check the looks of a batch or a whole fleet at once instead of opening each
model in the showcase. See `model-sheet.mjs` and `vehicle-gallery.mjs`.

They draw through the showcase's own renderer, `../site/render.mjs`, from a built tree, so a review judges what the
showcase shows and no second renderer can drift from it. A vehicle is assembled from its built placements, the one
source of where its parts sit; see `../docs/decisions/0001-vehicle-placements.md`. Each picture has four views over a
ground grid, because a view fitted to its square hides scale. The views look from where the model frame puts the
front, not from the model's proportions; see `../docs/decisions/0002-model-frame.md`.

A vehicle's picture adds its exploded view, because a picture of the whole hides the parts inside it, such as an
engine's accessories round its core. The showcase's viewer explodes a vehicle by the same rule, `../site/explode.mjs`,
`explode`, so a review judges the parts the showcase shows. The rule clears every part of every other rather than
spreading them by distance alone, because parts that touch sit at nearly the same distance from the centre and would
move out together. The exploded view looks from the side most parts move toward, because a part pushed out of the
far side, such as a brake out of the back of its wheel, would hide behind the whole.

A model built of components, such as a gun, is drawn exploded by the same rule, because its parts meet at mount
sites its file names; see `../docs/decisions/0009-component-mounts.md`.

A wearable's picture adds it worn on the doll, because a loose or folded item does not show whether it fits the body.
The showcase's viewer dresses it by the same sites; see `../docs/decisions/0008-dressing.md`. Below, the dressed doll
is seen straight down at the sizes a top-down game draws a figure, voxel and smooth, because there a garment's front
is out of sight and only its colour and its top surfaces carry it. Those views are drawn at their real pixel size and
enlarged without smoothing, so a review judges the pixels a game shows; see `../site/tile.mjs`, `drawOverhead`.

A pose sheet, `pose-sheet.mjs`, draws the doll bent by a pose fixture or a pose file, bare or dressed, because a
wearable worn still does not show whether it fits when a limb bends, and a pose written by hand needs seeing before
it becomes a clip. It draws through the posing page, `../site/pose.mjs`, which hangs each worn piece from the bone of
the part it is drawn in, and compiles the file by `../site/poseFile.mjs`, `compilePose`, as the page does, so the
sheet shows what the page shows. With `--probe` it marks where the pose shows the body through the garment
(`../site/clearance.mjs`, `clearanceProbe`), and with `--skin` it draws what of the covered body each review view
shows (`../site/skin.mjs`, `skinCheck`); see `../docs/decisions/0011-clearance-classified.md`. With `--doll` it draws
another doll of the dressing, wearing the garments the player does, each piece placed on the part its doll's `slots` map
its segment to: the garments are not fitted to that body, so what the sheet shows is how far they are from fitting
it. A wearable the doll has no place for is refused with the reason, never stood on it as a loose prop; the fixtures
name the player's bones, so such a doll stands at rest or takes a pose file written for its own rig. The clearance sweep,
`clearance-sweep.mjs`, runs both on every wearable riding the doll's bones in every pose fixture, because a change
to the doll or the rig moves every fit at once. The sheets and the sweep reach the showcase through one served site
and one headless browser, `reviewSite.mjs`, so no tool serves it its own way.

`node tools/joint-cover.mjs` reports what every fitted garment bares at the knee, the elbow and the neck as the UAL
doll plays the mannequin's own walk, jog and sprint (`ualClip.mjs` poses the rig from the vendored GLB's clips). A
rigid piece rides one bone, so two that meet over a joint part as it bends, which the rest check cannot see. The
report is of skin seen from straight above, in pixels of a figure drawn 25 and 50 px tall, because that is rog1's
camera and those are its sizes; it ranks the garments and gates nothing, since what reads at that size is judged by
eye. It writes `look/joint-cover/report.md` and `report.json`.

The doll is a named target, since a second body should be a record and not a second copy of the code; why there is a
second doll, and one set of garments for both, is in `../docs/decisions/0023-ual-doll.md`. Each doll is a
record in `../models/dolls/<id>/doll.libsonnet`, listed in `../models/dressing.libsonnet`; the build, the checks and
`dollRig.mjs`'s `exportDollRigs` take the dressing as one doll wears it (`dress.mjs`, `dollDressing`) and run for every
doll, and the manifest's `dolls` names each one's rig file. A garment's pieces are fitted to the player and checked on
every doll, so the checks run each garment on each doll, and the rest-poke allowances name the doll they were judged
on. What is still the player's alone, named so in the code (`PLAYER`) and not left to a first doll, is the baked wields
and locomotion, the press check, the head-band fit and the showcase's whole worn view, because their content was worked
out on the player's body, and the names in a garment's `wornOn` and `covers`, which are the player's parts and regions on every doll: each doll's rig says in its bones' `bind.wears` which bone answers to a name, where a piece rests on it and what the piece hides there. A limb a doll rests
turned, such as a T-pose arm, is a `turn` on its site in the record and not a turn inside the model, so the models
stay authored hanging as `docs/decisions/0008-dressing.md` has them. A limb may hang on another limb's anchor, and
then takes that limb's turn before its own: the thumb is such a limb on the arm, hung from its hand's thumb root and
turned by the frame its bones run in, since it leaves the hand askew of every axis and a part is drawn square to its
model's. A hand or a loose wearable is read off a turned
part as it hangs and swung with the turn, since the turned part's box is a looser one at any angle but a quarter turn.
A loose wearable across both copies of a turned part is refused, as the copies turn apart and one model cannot follow both. A doll whose
bones are not the player's gives its joints' places and its extra cuts to the body families as content
(`packages/thing-authoring-tool/README.md`, Body families).
A doll measured off a skeleton, such as UAL's, names that skeleton in its rig, and the rig is refused unless every
part sits on its bone's head and every node rests turned as the skeleton's, to 0.1 mm and 1e-4: a game plays the
skeleton's own clips on the doll, so a part off its joint would swing about the wrong point. The UAL doll's measures
(`../models/dolls/ual/measures.libsonnet`) therefore read every joint off the skeleton rather than copying numbers,
and only what a skeleton does not give, the girths, the face and the hair, is set by hand against the mannequin.

Placements are flat, so an engine fitted as an assembly comes apart in its vehicle as its sites, each from the
vehicle's centre. Each assembly a kit builds, such as an engine with its fittings, a turret with its weapons or a
wheel with its brake, is therefore also drawn on its own and exploded about its own centre. The assemblies come from
the kits themselves, laid out as the kit fits them, so a new kit or kit entry is drawn without a list to keep; see
`assemblies.mjs`, `readAssemblies`.

The review views look from above, so parts a vehicle carries under its floor or behind its cab, such as an exhaust
run, a fuel tank or a stack, hide under the body. A look can therefore ask for the underside views instead, and for
only the sites whose ids start with given prefixes, so those parts are drawn where they sit without the body; the
grid is left out of a view from below, where it would lie between the camera and the model. See
`../site/lookOptions.mjs`. A sheet shows one look, so drawing with other options into a folder replaces its rows.

A sheet keeps every entry drawn into its folder, so a batch still reads whole after a few entries are redrawn. Each
picture records a digest of the built files it was drawn from, so the gallery tells a render older than its model by
content, not by file times that every rebuild resets; see `look.mjs`, `staleIds`. Output defaults to the ignored
`look/`, so a look never leaves tracked changes.

Drawing needs a headless browser and takes seconds per model, so it runs on demand and never in CI, whose wall clock
comes first. Its tests cover only its logic: which entries a look draws, which way its views look, how an assembly is
laid out and comes apart and when a picture is stale. The browser is Playwright's Chromium, which the gun tool's browser
tests already use.

Which rows to draw first comes from the review probes, which rank the rows nobody has reviewed by the defects reviews
keep finding. See `review-probe.mjs` and `../docs/decisions/0018-review-probes.md`.
