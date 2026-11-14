// The gearboxes, each a plain case, by part id; see `shared.libsonnet`, `gearbox`. `length` is along x, the shaft's line.
{
  gearbox_transaxle: { title: 'Transaxle gearbox', massKg: 35, length: 0.3, width: 0.4, height: 0.3 },
  gearbox_inline: { title: 'Inline gearbox', massKg: 48, length: 0.62, width: 0.28, height: 0.3 },
  gearbox_truck: { title: 'Truck gearbox', massKg: 110, length: 0.72, width: 0.42, height: 0.42 },
  gearbox_heavy: { title: 'Heavy gearbox', massKg: 240, length: 0.95, width: 0.52, height: 0.55 },
}
