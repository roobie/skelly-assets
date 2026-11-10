---
read_if:
  - adding or changing a tracked vehicle's running gear: its links, sprocket, idler, road wheels or rollers
  - adding a track size class
  - consuming a tracked vehicle's wheel sites, such as a game that turns wheels or loots them
---

# 6. A track is a band of links with its wheels at sites of their own, in size classes

## Context

A track was one model, a band with its sprocket, idler and rollers drawn in, so a scavenger could take the whole track
and nothing else, and a game could not turn its wheels. Engines, turrets and wheels met the same need with a core and
salvageable fittings in size classes (`docs/decisions/0004-assemblies.md`, "Decision"). A placement has no parent and
a game turns only whole sites, so a part turns only when it has a site of its own. A track's band does not turn about
an axle: its links run round a loop, which a site cannot express.

## Decision

A track is an assembly. Its core is the band, laid from its class's links round the wheels it wraps, with a machine's
track frame; its sprocket, idler and each road wheel or roller are fittings at sites of their own. A vehicle fits the
track fused as one model, or as the band and its wheels. See `models/vehicles/track-kit.libsonnet`, `sites`, and
`models/vehicles/tracks.libsonnet`.

The links and wheels belong to a size class, so a link or road wheel salvaged from one vehicle fits another of its
class. See `models/vehicles/track-classes.libsonnet`. A rubber band is one moulding a scavenger cannot knock apart, so
its links have no row; steel links do.

## Consequences

A consumer that turns wheels turns a tracked vehicle's sprocket, idler and road wheel or roller sites, which only it
knows to do, since a site does not say it turns. The band stays still: a band whose links run needs a consumer that
moves pieces along a loop, which no consumer has. A test holds every track to weighing and drawing the same fused as
assembled, and each wheel to resting on the band without cutting into it or another wheel; see
`tools/test/assembly-kits.test.mjs`.
