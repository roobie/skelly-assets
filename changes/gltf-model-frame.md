---
type: breaking
---
Every model is now in glTF's frame: +z forward, +y up, +x the model's left. Drop any axis conversion on import, and
update what assumed the old frame: held poses and rests (working end +z, roll about +z), vehicle placements (far-side
twins mirror across x), mob yaw and gun file axes.
