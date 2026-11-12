local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local s = import 'microcar.spec.libsonnet';
local vehicle = import 'microcar.placements.libsonnet';
local electric = import 'electric_microcar.placements.libsonnet';
local body = (import 'car-body.libsonnet').rows;
// The electric car's nose and shell: this file is what the thing tool indexes for a vehicle derived from this one. Its
// shell carries what the electric drive adds that no part models, such as the charger, the high-voltage wiring, the
// heater and the pack's cradle, so the fitted car weighs what the reference does at the kerb.
local electricSpec = s + { blankNose: true, noseAccent: 'plastic-green', shellMass: 431 };
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, body('microcar', vehicle.title, s) + [
  row
  for row in body('electric_microcar', electric.title, electricSpec)
  if std.member(['electric_microcar_front_bumper', 'electric_microcar_shell'], row.id)
])
