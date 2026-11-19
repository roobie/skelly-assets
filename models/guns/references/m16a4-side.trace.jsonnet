local photo = 'https://www.militariazone.com/upload/images/shopprod/83357/deactivated-m16a4-assault-rifle-new-eu-deactivation-_83357_pic1_size1.jpg';
local m16 = 'https://en.wikipedia.org/wiki/M16_rifle';
local picatinny = 'https://en.wikipedia.org/wiki/Picatinny_rail';
local carryHandle = 'https://www.wingtactical.com/accessories/optics-sights/sights/aero-precision-a2-detachable-carry-handle-with-rear-sight';
local a2Stock = 'https://www.gunmann.com/learning/a1-vs-a2-stock/';
local sourced(value, source) = { kind: 'sourced', value: value, source: source };
local derived(value, reason) = { kind: 'derived', value: value, reason: reason };
local feature(paths) = { kind: 'derived', paths: paths };
local overall = sourced(1000, m16);
local stockLength = sourced(266.7, a2Stock);
local railPitch = sourced(10.01, picatinny);
{
  title: 'M16A4 side profile',
  document: 'tools/packages/gun-authoring-tool/docs/m16a4-trace.md',
  values: {
    photoWidthPx: sourced(3840, photo),
    photoHeightPx: sourced(2880, photo),
    overallLengthMm: overall,
    carryHandleLengthMm: sourced(176.276, carryHandle),
    stockLengthMm: stockLength,
    boreYPx: derived(1349, 'Barrel centre either side of the front sight base; the muzzle centre reads 1350'),
    railTopYPx: derived(1235, "Rail tooth tops: the slot cuts start under the handle's base, and the rail's end ahead of the front leg reads the same"),
    receiverTopYPx: derived(1250, "The upper's top under the rail, at the rail's end; behind it the rail's undercut shades it to 1243 px"),
    handleRearXPx: derived(1212, "The detachable handle's rear face, registered on the upper's rear face"),
    handleBaseYPx: derived(1222, "The window's bottom, the top of the handle's base on the rail"),
    housingTopYPx: derived(1151, 'The rear sight housing top, where the aperture ears stand'),
    housingFrontXPx: derived(1405, "The rear sight housing's front face, where the bar leaves it"),
    windowFrontXPx: derived(1809.5, "The window's front, the front leg's rear face"),
    windowTopYPx: derived(1137.5, "The window's top at its front, under the bar"),
    handleFrontXPx: derived(1838.5, "The front leg's front face"),
    apertureXPx: derived(1297, 'Windage knob centre, the axis the aperture sits on; it stands 1113 px, 64 mm over the bore'),
    fsbRearXPx: derived(3013, 'Where the rear rake meets the rear face; the band behind it is the handguard cap lip'),
    fsbFrontXPx: derived(3177, 'The front face at the deck'),
    fsbDeckYPx: derived(1282, 'The deck top the struts stand on'),
    fsbCrownFootYPx: derived(1162, 'Where the struts meet the crown, the top of the window between them'),
    postXPx: derived(3138, 'Crown centre; the post tip itself hides behind the ears'),
    combYPx: derived(1281, 'Comb top, level from the heel to the stock front'),
    barDepthPx: derived(6, 'The bar side face over the window near its front, 1.6 mm, thinner than a detail voxel'),
  },
  reference: {
    id: 'm16a4-side',
    svg: 'm16a4-side.svg',
    calibration: {
      pixels: derived([[107.5, 1350], [3798, 1350]], 'Butt plate rearmost point to the flash hider face'),
      lengthMm: overall,
    },
    allowancePercent: derived(3, 'Visible-edge picking on a 3840 px catalogue photo shot slightly from below'),
    comparisons: {
      railNinePitches: {
        pixels: derived([[2000, 1240], [2329, 1240]], 'Nine slot pitches by autocorrelation of the rail top between 2000 and 3000 px'),
        lengthMm: derived(9 * railPitch.value, 'Nine sourced Picatinny slot pitches'),
      },
      stockLength: { pixels: derived([[107.5, 1350], [1100, 1350]], 'Butt plate rearmost point to the stock front'), lengthMm: stockLength },
      carryHandleLength: { pixels: derived([[1212, 1240], [1838.5, 1240]], 'Handle rear face to the front leg'), lengthMm: sourced(176.276, carryHandle) },
    },
    landmarks: {
      bore: derived([[2900, 1349], [3798, 1350]], 'Barrel centre behind the front sight base and at the muzzle'),
      railTop: derived([[1212, 1235], [1838.5, 1235]], 'Rail tooth tops under the carry handle'),
      handleBarTop: derived([[1410, 1093.5], [1810, 1133.5]], 'The bar top, falling 1 px in 10 to the front'),
      apertureAxis: derived([[1297, 1113]], 'Windage knob centre'),
      frontSightBaseRearFace: derived([[3013, 1262], [3013, 1300]], 'Rear face below the rake'),
      frontPostCrown: derived([[3138, 1109]], 'Crown centre over the post'),
    },
    features: {
      carryHandle: feature(['carry-handle', 'carry-handle-window']),
      frontSightBase: feature(['front-sight-base', 'front-sight-base-window']),
      a2Stock: feature(['a2-stock-comb']),
    },
  },
}
