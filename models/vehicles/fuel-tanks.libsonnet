// The fuel tanks built as a body with their class's filler neck and a pair of straps; see `fuel-tank-kit.libsonnet`.
// `massKg` is the whole tank's, so the fused model and the assembly weigh the same and the body takes what the neck
// and straps leave. A strap fits only its own tank's size, so it is a row of each tank's. `length` is along x and
// `width` along z; a drum's `width` and `height` are its diameter.
{
  fuel_tank_car: { class: 'light', massKg: 9, length: 0.42, width: 0.6, height: 0.16, strapKg: 0.5 },
  fuel_tank_van: { class: 'light', massKg: 14, length: 0.52, width: 0.72, height: 0.24, strapKg: 0.5 },
  fuel_tank_truck: { class: 'heavy', massKg: 28, length: 0.9, width: 0.52, height: 0.52, strapKg: 2 },
}
