local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local s = import 'city_car.spec.libsonnet';
local vehicle = import 'city_car.placements.libsonnet';
local electric = import 'electric_city_car.placements.libsonnet';
local body = (import 'car-body.libsonnet').rows;
// The electric car's nose: this file is what the thing tool indexes for a vehicle derived from this one.
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, body('city_car', vehicle.title, s) + [
  row
  for row in body('electric_city_car', electric.title, s + { blankNose: true, noseAccent: 'plastic-green' })
  if row.id == 'electric_city_car_front_bumper'
])
