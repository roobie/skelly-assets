---
type: added
---
The showcase's model page has a Smooth switch that draws a model as its smooth copy instead of its voxels, keeping the
camera where it is, and says when a model has no copy, as a mob or a severed part has none. The switch is kept in the
page's link as `smooth=1`. `models.json` names each model's copy as `smooth: { file, bytes }`.
