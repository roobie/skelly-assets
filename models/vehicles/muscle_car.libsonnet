local frame = import 'frame.libsonnet';
local vehicle = import 'muscle_car.placements.libsonnet';
frame.vehicleRows({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('muscle_car', vehicle.title, import 'muscle_car.spec.libsonnet'))
