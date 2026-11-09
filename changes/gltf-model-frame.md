---
type: breaking
---
Every model is now in glTF's frame: +z forward, +y up, +x the model's left. Held models put their working end on
+z, vehicle placements are in the model frame with far-side twins mirrored across x, actors face +z, and guns lie
with their bore along +z and their right along -x.

Upgrade:
- Drop any axis conversion on import; every kind of model needs the same turn, none for a consumer in glTF's frame.
- Held models: a grip turn now carries the file onto held axes with the working end +z and up +y, so the
  forward hold turns +z, not +x, to the view's front (in skelly, the half turn about y replaces the quarter turn
  in `prepareModel` and `modelToView`), and the upright hold raises +z (a quarter turn about x instead of z).
- Apply `roll` about +z, not +x, and stand an upright `rest` on its -z end. A lens defaults to the middle of the
  +z end.
- Mirror a left-handed hold across the model's x, not z (in skelly, `mirrorModelZ`).
- Vehicles: lay out blueprints in the model frame, forward +z and the near side at -x: a site at x, y, z in the old
  vehicle frame is now at -z, y, x. Mirror a far-side twin across x (in skelly, `pair()` and `place()`). A view
  that turned a vehicle's front from +x (in skelly, `FORWARD_TO_FRONT`) turns it from +z instead.
- Actors face +z: take yaw as `atan2(facing[0], facing[2])` instead of `atan2(-facing[0], -facing[2])`
  (in skelly, `yawOf` and the other actor yaws).
- Guns: read a gun's anchors, hands, collision and round seats with the bore along +z; the default export's grip
  turn is none. A gun exported outside this repository takes the same turn, `FILE_FROM_GUNGEN` in
  `tools/packages/gun-authoring-tool/src/gun/exportFrame.ts`.
- A magazine round's `tilt` is now about the file's -x, the magazine's right, instead of its +z.
- Cite the frame decision at `docs/decisions/0002-model-frame.md`, renamed from `0002-deadvox-model-frame.md`.
