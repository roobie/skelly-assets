local frame = import 'frame.libsonnet';
local vehicle = import 'minibus.placements.libsonnet';
frame.vehicleRows({ tags: { 'vehicle-body': ['van'] } }, (import 'van-body.libsonnet').rows('minibus', vehicle.title, import 'minibus.spec.libsonnet'))
