local photo = 'https://commons.wikimedia.org/wiki/File:Simonow_SKS_45_noBG.jpg';
local article = 'https://en.wikipedia.org/wiki/SKS';
local sourced(value, source) = { kind: 'sourced', value: value, source: source };
local derived(value, reason) = { kind: 'derived', value: value, reason: reason };
local unknown(reason) = { kind: 'unknown', reason: reason };
{
  title: 'SKS-45 provisional profile',
  document: 'tools/packages/gun-authoring-tool/docs/sks-export.md',
  values: {
    photoWidthPx: sourced(1280, photo),
    photoHeightPx: sourced(562, photo),
    overallLengthMm: sourced(1021, article),
    barrelLengthMm: sourced(520, article),
    contourAllowancePx: derived(3, 'Manual visible-edge picking on a background-removed 1280 px photo'),
    breechPx: unknown('The breech is hidden inside the receiver, so the cited barrel length places it rather than the photo'),
    systematicScaleError: unknown('Lens perspective and the photographed rifle’s production variant are unknown'),
  },
}
