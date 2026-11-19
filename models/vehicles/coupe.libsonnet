local frame = import 'frame.libsonnet';
local vehicle = import 'coupe.placements.libsonnet';
frame.vehicleRows({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('coupe', vehicle.title, import 'coupe.spec.libsonnet'))
