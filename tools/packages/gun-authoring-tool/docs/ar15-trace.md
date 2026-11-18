---
read_if:
  - you author the modular AR-15 and need its reference silhouette or provisional scale
  - you interpret the AR-15 trace records or their module boundaries
---

# AR-15 profile study

## Purpose and boundary

Trace before modelling so the existing generic AR archetype does not become the shape reference for its own rebuild. This study fixes an appearance reference and the visible module boundaries of a standard AR-15; it is not manufacturing geometry. The scope and module-matrix decisions for the rebuild are still pending the owner, so nothing here settles which modules exist or how they vary.

Two photographs are used because neither suffices alone. A whole-rifle product image gives silhouette and proportions but is too coarse for receiver detail; a receiver close-up gives that detail but shows no stock, barrel or handguard. The photographs stay outside the repository; each record cites its own. The [profile trace record](../../../../models/guns/references/ar15-profile.trace.json) and its [visible-edge SVG](../../../../models/guns/references/ar15-profile.svg) cover the whole rifle; the [receiver trace record](../../../../models/guns/references/ar15-receiver.trace.json) and its [visible-edge SVG](../../../../models/guns/references/ar15-receiver.svg) cover the receiver. Shared tracing policy and its reasons are in `tracing.md`.

## Identification and calibration

The profile photograph is a catalogue image of a named commercial rifle whose listing publishes handguard and barrel length. The handguard is the only published length whose both ends are visible, so it calibrates the profile. The published barrel length cannot be checked because its breech is hidden. Nominal handguard lengths can differ from the visible span, so the scale carries that unknown systematic error.

The receiver close-up has no published dimensions of its own. The Picatinny slot pitch is a standard dimension that appears many times along the rail, so it calibrates the close-up without depending on the receiver's maker. One pitch is the calibration because the record requires a sourced length; the eleven-pitch span is a comparison that shows how far a single pick strays from the mean.

The takedown-to-pivot pin spacing is compared, not used to calibrate, because its only located source is owner discussion of drawings rather than a published print. Both photographs read a few percent long against it; whether that is perspective, the source or picking is unresolved.

## Silhouette interpretation

Both photographs show the ejection-port side. Control placement on the other side is not established by either. The close-up's rifle carries optional parts: an extended charging-handle latch, an enlarged trigger guard, an aftermarket grip and ambidextrous controls. These are left untraced because the reference must describe the standard rifle the options attach to; the profile photograph supplies the standard grip, guard and charging handle instead.

The free-float handguard hides the gas block and barrel nut, so gas system length and block position are unknown, not assumed. The upper receiver's rear face against the buffer tower is shadowed in the close-up, so that boundary stays an open path.

## Module boundaries

The landmarks named `module…` mark where separable assemblies meet: stock on the receiver extension, receiver extension on the lower, upper on lower at the pins, upper front on the handguard, barrel on the muzzle device, magazine in its well, and grip on the lower. They are recorded as visible seams so the rebuild can test its module cuts against a real rifle; they do not decide which of these become modules.

## Comparison boundary

Compare against the existing curated design, `models/guns/designs/archetype-ar-free-float.json`, at native physical scale, so proportion errors are not hidden by stretching. Registration at the upper/handguard interface is not proof of fit, and photo perspective is unrectified.
