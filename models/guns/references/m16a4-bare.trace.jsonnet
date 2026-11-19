local photo = 'BR-supplied reference photo (dert drop 2026-11-19), M16A4 bare side view';
local m16 = 'https://en.wikipedia.org/wiki/M16_rifle';
local side = import 'm16a4-side.trace.jsonnet';
local sourced(value, source) = { kind: 'sourced', value: value, source: source };
local derived(value, reason) = { kind: 'derived', value: value, reason: reason };
local feature(paths) = { kind: 'derived', paths: paths };
local overall = sourced(1000, m16);
// The side record's scale, for the span both photos show.
local sideCalibration = side.reference.calibration;
local sideMmPerPx = sideCalibration.lengthMm.value / (sideCalibration.pixels.value[1][0] - sideCalibration.pixels.value[0][0]);
{
  title: 'M16A4 bare side profile',
  document: 'tools/packages/gun-authoring-tool/docs/m16a4-trace.md',
  values: {
    photoWidthPx: derived(1000, photo),
    photoHeightPx: derived(412, photo),
    overallLengthMm: overall,
    stockLengthMm: side.values.stockLengthMm,
    boreYPx: derived(169.8, 'Barrel centre between 800 and 875 px, ' + photo),
    combYPx: derived(157.0, 'Comb top, level within 0.6 px from the heel to the stock front, ' + photo),
    buttRearXPx: derived(114.6, 'Butt plate rearmost point, at the bore height, ' + photo),
  },
  reference: {
    id: 'm16a4-bare',
    svg: 'm16a4-bare.svg',
    calibration: {
      pixels: derived([[114.6, 170], [921.4, 170]], 'Butt plate rearmost point to the flash hider face, ' + photo),
      lengthMm: overall,
    },
    allowancePercent: derived(5, 'Visible-edge picking at 1.24 mm a pixel, ' + photo),
    comparisons: {
      stockLength: { pixels: derived([[114.6, 170], [332, 170]], 'Butt plate rearmost point to the stock front'), lengthMm: side.values.stockLengthMm },
      frontSightBaseToMuzzle: {
        pixels: derived([[787, 170], [921.4, 170]], 'Front sight base front face to the flash hider face'),
        lengthMm: derived((3798 - 3177) * sideMmPerPx, 'The same span on the m16a4-side record, at its scale'),
      },
    },
    landmarks: {
      bore: derived([[800, 169.8], [875, 169.8]], 'Barrel centre'),
      comb: derived([[120, 157.0], [332, 157.0]], 'Comb top'),
    },
    features: {
      a2Stock: feature(['a2-stock']),
      frontSightBase: feature(['front-sight-base']),
    },
  },
}
