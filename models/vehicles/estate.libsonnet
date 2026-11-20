local frame = import 'frame.libsonnet';
local vehicle = import 'estate.placements.libsonnet';
frame.vehicleRows({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('estate', vehicle.title, import 'estate.spec.libsonnet'))
