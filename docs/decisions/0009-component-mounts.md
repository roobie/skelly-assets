---
read_if:
  - taking a model apart into its components, in an exploded view or to swap one
  - changing what a GLB records on its part or port nodes
  - adding a mount type, a size class or a standard to the parts a component meets its neighbour by
  - wondering why a component hangs from one neighbour and not another
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
`partMounts`, and `tools/packages/thing-export/src/exportTypes.ts`, `ExportMount`. The port nodes already carry the
position and orientation of each site, with its mount type, size and standard, so a reader takes the frame from the
port it names, and a mount type or size class added later is another key on the port node rather than a new shape
for the joint.

A part hangs from the joint whose site is nearest the root, so taking a model apart from the root outward always
finds the site in place, and a barrel held by both receiver and handguard hangs from the receiver whichever joint
the design lists first. A tie keeps the joint that placed the part.

The part nodes stay flat under the root, as deadvox reads them, and the joints sit beside them as extras. A model
comes apart when any of its parts declares a mount; the showcase and the review sheets explode it by the same rule
as a vehicle (`site/explode.mjs`, `explode`), so a review judges the components the showcase shows; see
`tools/components.mjs`, `modelComponents`. A skinned model and a wearable are not taken apart: a skin binds its parts
to bones, and a wearable is shown worn (`docs/decisions/0008-dressing.md`).

## Consequences

Every construct model with more than one part, not only a gun, now comes apart on the showcase and the sheets. A
consumer that ignores the new extras loads the files unchanged. A component is one part node, so its mass is that
part's mass in the gun's sidecar and the components sum to the gun's mass without a second record. Swapping a component needs a rule for which interfaces fit which sites, which the mount type,
size and standard on each port are there to carry; no consumer reads the joints yet.
