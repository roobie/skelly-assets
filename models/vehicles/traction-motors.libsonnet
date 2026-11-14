// The traction motors by part id; see `shared.libsonnet`, `tractionMotor`. `radius` is the stator's, which stands on
// its base, and `length` runs across the vehicle.
{
  traction_motor_light: { title: 'Light traction motor', massKg: 25, radius: 0.1, length: 0.24 },
  traction_motor_car: { title: 'Car traction motor', massKg: 65, radius: 0.15, length: 0.36 },
  traction_motor_large: { title: 'Large traction motor', massKg: 240, radius: 0.25, length: 0.6 },
}
