---
read_if:
  - you author the modular AR's A2 carry handle, A2 front sight base or A2 stock
  - you interpret the M16A4 trace records
---

# M16A4 profile study

## Purpose and boundary

The AR-15 profile study traces a free-float carbine, so it shows none of the A2 parts the modular rifle builds: the carry handle, the triangular front sight base and the fixed stock. Without a reference those parts were sized from catalogue numbers alone and drawn as boxes, which loses the shapes that make them read as A2 parts. This study traces those three parts and nothing else.

Two photographs are used. The [side trace record](../../../../models/guns/references/m16a4-side.trace.json) and its [visible-edge SVG](../../../../models/guns/references/m16a4-side.svg) cite a high-resolution catalogue photo of a deactivated M16A4; the [bare trace record](../../../../models/guns/references/m16a4-bare.trace.json) and its [visible-edge SVG](../../../../models/guns/references/m16a4-bare.svg) cite a low-resolution bare side view the owner supplied, which has no URL. Shared tracing policy and its reasons are in `tracing.md`.

## Calibration

Both photos show the whole rifle, so both are scaled by the M16A4's published overall length. That ties them to one source and lets them check each other: each one's stock comes out within about 1% of the published A2 stock length, and the front sight base to muzzle span agrees between them to within two of the bare photo's pixels. The side photo's rail pitch agrees with its overall-length scale to about 1%, which bounds the perspective error over the receiver.

## Which photo traces what

The bare photo is preferred for the stock because the side photo's belly sits against a dark shadow, which reads about 7% shallower. The side photo traces the carry handle, since only it resolves the handle at all, and the comb height over the bore, since at its scale one pixel is a fifth of the bare photo's. The front sight base is traced from the side photo too: at the bare photo's scale the whole base is about 36 pixels long, too few to place its struts, so the bare outline serves only as a check of its height and rake.

The side photo's handle is the detachable one of a flat-top M16A4. The fixed A2 handle has the same sight housing and bar, so the trace stands for it above the rail; below the rail the fixed handle is forged to the receiver, solid down to the receiver's top, where the flat-top carries its rail. Its window keeps the photo's bottom, the top of the handle's base, so the charging handle's volume under it stays.

The rail's height over the bore comes from a 308ar forum compilation of flat-top rail heights, since no print of the upper is published; an ar15.com thread on the same dimension refused automated fetching, so it does not corroborate it here; the side photo reads within its trace of it, and it governs the R1 carbine too, whose profile photo is too coarse to place the rail. The receiver stands to the foot of the rail's teeth, as the side photo shows.

## Known departures

The handle's bar is thinner over the window front than a detail voxel; the model lowers the window top so the bar keeps two voxels there. The traced handle is 3.7% shorter than the published detachable handle; the trace is kept, as the photo shows the shape the published length does not. The front sight base's struts are drawn thicker than the photo's and its crown plainer, so the triangle reads at the model's scale.
