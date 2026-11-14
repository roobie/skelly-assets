---
type: fixed
---
Fabric grain's slow mottle no longer stripes a stepped garment, such as the wizard robe's skirt, at mid distance, and
the thing and gun authoring tools draw a fabric finish's grain beside its sheen. The shader moved to
`tools/fabric.mjs`; a game that ported it ports the mottle's change too (`tools/fabric.mjs`, `wearFabric`).
