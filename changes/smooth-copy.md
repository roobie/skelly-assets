---
type: added
---
Every built model except mobs and severed parts has a smooth copy, its authored shapes rather than voxels, in a `<pack>.smooth` pack named by the entry's `smooth: { pack, path }`; load that pack beside the model's to draw it smooth.
The copy has the same part nodes, pieces and skin, and uses the entry's sidecar unchanged, so mass, anchors and collision are the voxel model's and sit within half its voxel grain of the smooth surface.
