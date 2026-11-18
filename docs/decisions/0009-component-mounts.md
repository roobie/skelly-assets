---
read_if:
  - taking a model apart into its components, in an exploded view or to swap one
  - changing what a GLB records on its part or port nodes
  - adding a mount type, a size class or a standard to the parts a component meets its neighbour by
  - adding a gun platform, or deciding which gun parts swap between designs and by which path
  - wondering why a component hangs from one neighbour and not another
  - linking a part of a model to the catalogue item it is
---

# 9. Components meet at named mount sites

## Context

A gun is authored as parts joined at ports, but its GLB showed only where each part sits, so an exploded view or a
component swap had nothing to go on but fixed offsets. An offset says where one component sat in one design; it does
not say where a replacement must meet its neighbour, and it goes stale whenever either part moves. Deadvox loads the
same files and finds a gun's action parts by node name, so the export must not move, nest or rename a node.

## Decision

Each part node records its joints as the ports they join, not as transforms: `mount`, the joint that holds it, and
`meets`, the others that close a loop. A joint names the site port on the neighbour and the interface port on the
part itself, with the slot and roll the connection gave; see `tools/packages/thing-export/src/mounts.ts`,
`partMounts`, and `tools/packages/thing-export/src/exportTypes.ts`, `ExportMount`. The port nodes carry the position
and orientation of each site with what decides fit, so a reader takes the frame from the port it names, and what
decides fit grows as keys on the port node rather than as a new shape for the joint.

A gun component swaps only between designs of one platform, a family of real guns whose parts interchange, such as
the AR or the bolt rifles. A platform is not a template: several templates build one platform, and one platform spans
frames of different sizes, so each design names its platform and frame, and each port takes a size class from them.
A size class is not the port's `size`: the builder derives a size from its own params to check one assembly, while a
size class is content that says which designs' parts interchange, and a platform can share one class across its
frames where the real guns share that interface. Each mount type also names its swap path, by hand in a slot or as a
job of a named kind, because light parts swap in the field while barrels and bolt carriers need a tool or a bench.
Platforms, size classes and swap paths are a moddable table, not builder code, so a mod adds a platform without a
code change; see `models/guns/tables/platforms.jsonnet` and `tools/packages/gun-authoring-tool/src/gun/platforms.ts`,
`withPlatformPorts`. A component fits a site of another design when the platforms agree and the ports could meet in
one assembly; see `tools/packages/gun-authoring-tool/src/gun/platformFit.ts`, `fitMismatches`.

A part hangs from the joint whose site is nearest the root, so taking a model apart from the root outward always
finds the site in place, and a barrel held by both receiver and handguard hangs from the receiver whichever joint
the design lists first. A tie keeps the joint that placed the part.

The part nodes stay flat under the root, as deadvox reads them, and the joints sit beside them as extras. A model
comes apart when any of its parts declares a mount; the showcase and the review sheets explode it by the same rule
as a vehicle (`site/explode.mjs`, `explode`), so a review judges the components the showcase shows; see
`tools/components.mjs`, `modelComponents`. A skinned model and a wearable are not taken apart: a skin binds its parts
to bones, and a wearable is shown worn (`docs/decisions/0008-dressing.md`).

A part id is a local name, so which catalogue item a part is cannot be read off its id: a revolver's hammer part is
not the Hammer tool. A part that is an item in its own right says so with `item` on the part in the model source,
which the sidecar carries and the showcase links to that item's page; the build refuses an item no model has
(`tools/partItems.mjs`, `danglingPartItems`).

## Consequences

Every construct model with more than one part, not only a gun, now comes apart on the showcase and the sheets. A
consumer that ignores the new extras loads the files unchanged. A component is one part node, so its mass is that
part's mass in the gun's sidecar and the components sum to the gun's mass without a second record. A loose part or
an attachment exported on its own names no platform, because one catalogue item serves designs of several platforms.
