local frame = import 'frame.libsonnet';
local vehicle = import 'short_military_transport_helicopter.placements.libsonnet';
local s = import 'short_military_transport_helicopter.spec.libsonnet';
frame.vehicleRows({ tags: { 'vehicle-body': ['helicopter'] } },
                 (import 'military-helicopter-body.libsonnet').rows('short_military_transport_helicopter', vehicle.title, s))
