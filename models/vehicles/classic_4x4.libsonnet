local frame = import 'frame.libsonnet';
local vehicle = import 'classic_4x4.placements.libsonnet';
frame.vehicleRows({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('classic_4x4', vehicle.title, import 'classic_4x4.spec.libsonnet'))
