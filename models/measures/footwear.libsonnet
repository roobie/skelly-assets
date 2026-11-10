// Starting proportions for packages/thing-authoring-tool/footwear.libsonnet's boots; copy one and change what differs.
{
  hiking: { l: 0.29, w: 0.105, t: 0.022, layers: 6, ankle: 0.085, top: 0.17, rx: 0.046, rz: 0.058, collar: 0.022, collarOut: 0.006, toeSlot: 'rand' },
  western: { l: 0.3, w: 0.095, t: 0.012, heel: 0.03, point: 1, layers: 6, ankle: 0.08, top: 0.32, rx: 0.044, rz: 0.06, collar: 0.006, collarOut: 0.001 },
  larmor: { l: 0.29, w: 0.108, t: 0.016, heel: 0.01, layers: 6, ankle: 0.09, top: 0.25, rx: 0.05, rz: 0.06, collar: 0.016, toeSlot: 'plate' },
  plated: { l: 0.3, w: 0.112, t: 0.016, heel: 0.012, layers: 7, ankle: 0.1, top: 0.27, rx: 0.052, rz: 0.062, collar: 0.014, collarOut: 0.005, laneSlots: ['plate', 'edge'] },
  scrap: { l: 0.29, w: 0.11, t: 0.014, layers: 5, ankle: 0.085, top: 0.2, rx: 0.05, rz: 0.06, collar: 0.02, collarOut: 0.004, toeSlot: 'scrap' },
  work: { l: 0.29, w: 0.108, t: 0.024, heel: 0.006, layers: 6, ankle: 0.085, top: 0.18, rx: 0.048, rz: 0.058, collar: 0.02, collarOut: 0.005, toeSlot: 'toecap' },
  sheet: { l: 0.3, w: 0.116, t: 0.004, layers: 3, ankle: 0.095, top: 0, rx: 0.05, rz: 0.06, collar: 0, from: -0.02, laneSlots: ['plate', 'edge'] },
}
