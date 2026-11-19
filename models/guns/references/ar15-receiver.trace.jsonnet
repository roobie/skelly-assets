local photo = 'https://cdn.abicart.com/shop/images/224638606-origpic-c7c0f9/ws74/75074/art74/h8606/jWBt-1LA.jpg';
local picatinny = 'https://en.wikipedia.org/wiki/Picatinny_rail';
local pinSource = 'https://www.ar15.com/forums/ar-15/Take_Down_Pin_Spacing/118-414464/';
local sourced(value, source) = { kind: 'sourced', value: value, source: source };
local derived(value, reason) = { kind: 'derived', value: value, reason: reason };
local unknown(reason) = { kind: 'unknown', reason: reason };
local feature(paths) = { kind: 'derived', paths: paths };
local railPitch = sourced(10.01, picatinny);
local pinSpacing6375 = sourced(161.9, pinSource);
local pinSpacing6347 = sourced(161.2, pinSource);
local pinPixels = derived([[877, 1632], [3851, 1630]], 'Takedown and pivot pin head centres');
{
  title: 'AR-15 receiver provisional close-up',
  document: 'tools/packages/gun-authoring-tool/docs/ar15-trace.md',
  values: {
    photoWidthPx: sourced(4222, photo),
    photoHeightPx: sourced(4220, photo),
    railPitchMm: railPitch,
    pinSpacing6375Mm: pinSpacing6375,
    pinSpacing6347Mm: pinSpacing6347,
    contourAllowancePx: derived(20, 'Manual visible-edge picking; soft shadows on the dark finish'),
    upperRearToBufferTower: unknown('Forward-assist plunger and shadow hide the upper rear face against the lower buffer tower'),
    lowerRearOutline: unknown('Grip and receiver extension cover the lower rear'),
    chargingHandle: unknown('Extended latch is an option; the standard handle outline under it is not visible'),
    triggerGuard: unknown('Enlarged guard is an option'),
    grip: unknown('Aftermarket grip is an option'),
    selectorAndBoltCatch: unknown('Ambidextrous parts are options'),
    systematicScaleError: unknown('Close-range lens perspective is unknown; the rail plane sits nearer the camera than the receiver flats'),
  },
  reference: {
    id: 'ar15-receiver-ejection-side',
    svg: 'ar15-receiver.svg',
    calibration: {
      pixels: derived([[1622, 715], [1801, 715]], 'One rail pitch between near-side tooth front edges; the eleven-pitch mean is 179.1 px'),
      lengthMm: railPitch,
    },
    allowancePercent: derived(3, 'Registration/perspective authoring allowance for a close-up, not a statistical confidence interval'),
    comparisons: {
      railElevenPitches: {
        pixels: derived([[1622, 715], [3592, 715]], 'Eleven rail pitches between near-side tooth front edges'),
        lengthMm: derived(11 * railPitch.value, 'Eleven sourced Picatinny slot pitches'),
      },
      pinSpacing6375: { pixels: pinPixels, lengthMm: pinSpacing6375 },
      pinSpacing6347: { pixels: pinPixels, lengthMm: pinSpacing6347 },
    },
    landmarks: {
      railTop: derived([[700, 685], [3845, 683]], 'Rail tooth tops'),
      railToothFronts: derived([[1622, 715], [1801, 715], [1978, 715], [2155, 715], [2333, 715], [2512, 715], [2692, 715], [2870, 715], [3049, 715], [3228, 715], [3409, 715], [3590, 715]], 'Near-side tooth front edges'),
      moduleUpperLowerParting: derived([[804, 1512], [3760, 1512]], 'Module boundary: upper/lower parting line between the pins'),
      moduleUpperToHandguard: derived([[3875, 790], [3950, 1510]], 'Module boundary: upper front face against the handguard'),
      moduleMagazineWell: derived([[3665, 2000], [3660, 2350]], 'Module boundary: magazine well front'),
      moduleGripToLower: derived([[920, 2100], [1440, 2110]], 'Module boundary: grip top against the lower, read from the optional grip'),
      triggerOpeningTop: derived([[1560, 2105], [2300, 2105]], 'Lower edge above the trigger opening'),
      receiverExtensionTop: derived([[300, 927], [588, 927]], 'Receiver extension top edge where it leaves the buffer tower'),
    },
    features: {
      upperRail: feature(['upper-rail']),
      upperReceiver: feature(['upper-receiver']),
      forwardAssist: feature(['forward-assist']),
      forwardAssistHousing: feature(['forward-assist-housing']),
      brassDeflector: feature(['brass-deflector']),
      ejectionPortCover: feature(['ejection-port-cover']),
      portCoverHinge: feature(['port-cover-hinge']),
      upperFrontBoss: feature(['upper-front-boss']),
      lowerReceiver: feature(['lower-receiver']),
      takedownPin: feature(['takedown-pin']),
      pivotPin: feature(['pivot-pin']),
      magazineRelease: feature(['magazine-release']),
      trigger: feature(['trigger']),
      receiver: feature(['upper-receiver', 'lower-receiver']),
    },
  },
}
