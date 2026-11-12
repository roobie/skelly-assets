// The radiators built as a core with their class's fan and hoses; see `cooling-kit.libsonnet`. `massKg` is the whole
// radiator's, so the fused model and the assembly weigh the same and the core takes what the fan and hoses leave.
// `width` is across the vehicle and `height` up from the core's base.
{
  radiator_small: { title: 'Small radiator', class: 'light', massKg: 5, width: 0.62, height: 0.36 },
  radiator_car: { title: 'Car radiator', class: 'light', massKg: 7, width: 0.76, height: 0.42 },
  radiator_van: { title: 'Van radiator', class: 'medium', massKg: 10, width: 0.82, height: 0.55 },
  radiator_truck: { title: 'Truck radiator', class: 'heavy', massKg: 28, width: 0.9, height: 0.95 },
}
