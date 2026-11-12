local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local vehicle = import 'muscle_car.placements.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('muscle_car', vehicle.title, import 'muscle_car.spec.libsonnet'))
