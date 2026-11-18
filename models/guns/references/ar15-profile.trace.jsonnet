local photo = 'https://www.jakt.se/product-images/XL/anderson-am-15-utility-223-wylde-18-5rd-0.jpg';
local listing = 'https://www.jakt.se/anderson-am-15-utility-223-wylde-18-5rd';
local picatinny = 'https://en.wikipedia.org/wiki/Picatinny_rail';
local pinSource = 'https://www.ar15.com/forums/ar-15/Take_Down_Pin_Spacing/118-414464/';
local sourced(value, source) = { kind: 'sourced', value: value, source: source };
local derived(value, reason) = { kind: 'derived', value: value, reason: reason };
local unknown(reason) = { kind: 'unknown', reason: reason };
local feature(paths) = { kind: 'derived', paths: paths };
local railPitch = sourced(10.01, picatinny);
local handguard = sourced(381, listing);
local pinSpacing6375 = sourced(161.9, pinSource);
local pinSpacing6347 = sourced(161.2, pinSource);
local pinPixels = derived([[393, 121], [532, 121]], 'Takedown and pivot pin heads, each only a few pixels across at this resolution');
{
  title: 'AR-15 rifle provisional profile',
  document: 'tools/packages/gun-authoring-tool/docs/ar15-trace.md',
  values: {
    photoWidthPx: sourced(1032, photo),
    photoHeightPx: sourced(325, photo),
    handguardMm: handguard,
    barrelMm: sourced(457, listing),
    railPitchMm: railPitch,
    pinSpacing6375Mm: pinSpacing6375,
    pinSpacing6347Mm: pinSpacing6347,
    contourAllowancePx: derived(2, 'Manual visible-edge picking on a 1032 px product image'),
    boreYPx: derived(104, 'Barrel and muzzle-brake centreline; the receiver extension centre reads about 101'),
    registrationXPx: derived(538, 'Upper front face meeting the handguard rear skirt'),
    upperRearXPx: derived(381, 'Charging handle and shadow hide the upper rear face; placed from the receiver close-up, where the rail starts about 12 mm ahead of the handle rear'),
    portBandAboveCover: unknown('Dark band with a bright detail above the traced port cover; open port or upper flat is not resolved at this resolution'),
    gasBlockPositionMm: unknown('Low-profile adjustable block hidden inside the free-float handguard'),
    gasSystemLengthMm: unknown('Port position not visible; the listing does not state it'),
    barrelBreechPx: unknown('Barrel extension and nut hidden by receiver and handguard, so the sourced barrel length cannot be measured'),
    overallLengthMm: unknown('Not published; the adjustable stock position is unknown'),
    systematicScaleError: unknown('Nominal handguard length may differ from its visible span; product-shot lens perspective is unknown'),
  },
  reference: {
    id: 'ar15-whole-rifle-side-profile',
    svg: 'ar15-profile.svg',
    calibration: {
      pixels: derived([[538, 79], [857, 79]], 'Visible handguard rear skirt to front face along its top edge'),
      lengthMm: handguard,
    },
    allowancePercent: derived(5, 'Registration/perspective authoring allowance at product-image resolution, not a statistical confidence interval'),
    comparisons: {
      railTenPitches: {
        pixels: derived([[433, 76], [514, 76]], 'Ten upper-rail tooth pitches, each about 8 px wide'),
        lengthMm: derived(10 * railPitch.value, 'Ten sourced Picatinny slot pitches'),
      },
      pinSpacing6375: { pixels: pinPixels, lengthMm: pinSpacing6375 },
      pinSpacing6347: { pixels: pinPixels, lengthMm: pinSpacing6347 },
    },
    landmarks: {
      boreAxis: derived([[284, 104], [976, 104]], 'Provisional bore datum through barrel and brake'),
      topRailLine: derived([[386, 75], [857, 77]], 'Rail top, upper and handguard; handguard rail sits about 2 px lower except the raised front section'),
      moduleStockToReceiverExtension: derived([[284, 86], [284, 121]], 'Module boundary: stock front face slides on the receiver extension'),
      moduleReceiverExtensionToLower: derived([[370, 86], [370, 117]], 'Module boundary: end plate against the lower buffer tower'),
      moduleUpperLowerParting: derived([[376, 121], [537, 124]], 'Module boundary: upper/lower parting line between the pins'),
      moduleUpperToHandguard: derived([[538, 79], [538, 127]], 'Module boundary: upper front face, barrel nut under the handguard skirt'),
      moduleBarrelToMuzzle: derived([[903, 94], [903, 114]], 'Module boundary: muzzle thread shoulder behind the brake'),
      moduleMagazineWell: derived([[469, 170], [526, 162]], 'Module boundary: magazine well lip'),
      moduleGripToLower: derived([[380, 158], [418, 162]], 'Module boundary: grip top against the lower'),
      gripRake: derived([[399, 160], [368, 223]], 'Picked grip midline'),
      magazineFront: derived([[526, 162], [540, 248]], 'Visible front edge; forward rake from perspective and curve'),
    },
    features: {
      muzzleDevice: feature(['muzzle-brake']),
      exposedBarrel: feature(['barrel']),
      handguard: feature(['handguard']),
      handguardRail: feature(['handguard-rail']),
      upperRail: feature(['upper-rail']),
      upperReceiver: feature(['upper-receiver']),
      chargingHandle: feature(['charging-handle']),
      forwardAssist: feature(['forward-assist']),
      brassDeflector: feature(['brass-deflector']),
      ejectionPortCover: feature(['ejection-port-cover']),
      upperFrontBoss: feature(['upper-front-boss']),
      lowerReceiver: feature(['lower-receiver']),
      takedownPin: feature(['takedown-pin']),
      pivotPin: feature(['pivot-pin']),
      magazineRelease: feature(['magazine-release']),
      trigger: feature(['trigger']),
      triggerGuard: feature(['trigger-guard']),
      grip: feature(['grip']),
      magazine: feature(['magazine']),
      castleNut: feature(['castle-nut']),
      bufferTube: feature(['buffer-tube']),
      stock: feature(['stock']),
      overall: feature(['stock', 'muzzle-brake']),
    },
  },
}
