local photo = 'https://commons.wikimedia.org/wiki/File:Simonow_SKS_45_noBG.jpg';
local article = 'https://en.wikipedia.org/wiki/SKS';
local sourced(value, source) = { kind: 'sourced', value: value, source: source };
local derived(value, reason) = { kind: 'derived', value: value, reason: reason };
local unknown(reason) = { kind: 'unknown', reason: reason };
local overall = sourced(1021, article);
{
  title: 'SKS-45 provisional profile',
  document: 'tools/packages/gun-authoring-tool/docs/sks-export.md',
  values: {
    photoWidthPx: sourced(1280, photo),
    photoHeightPx: sourced(562, photo),
    overallLengthMm: overall,
    barrelLengthMm: sourced(520, article),
    mmPerPixel: derived(0.846, 'Cited overall length over the visible butt-plate heel to muzzle span; the photo shows the right side'),
    receiverFrontXPx: derived(740, 'Receiver front face meeting the handguard'),
    boreYPx: derived(84, 'Barrel centreline ahead of the handguard band'),
    contourAllowancePx: derived(3, 'Manual visible-edge picking on a background-removed 1280 px photo'),
    breechPx: unknown('The breech is hidden inside the receiver, so the cited barrel length places it rather than the photo'),
    systematicScaleError: unknown('Lens perspective and the photographed rifle’s production variant are unknown'),
  },
}
