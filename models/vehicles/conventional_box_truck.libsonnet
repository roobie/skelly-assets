local frame = import 'frame.libsonnet';
local t = import 'truck-cab.libsonnet';
local vehicle = import 'conventional_box_truck.placements.libsonnet';
// The box and its doors are the box truck's own, placed behind this cab; only the cab and chassis are pressed here.
frame.vehicleRows({ tags: { 'vehicle-body': ['truck'] } }, t.rows('conventional_box_truck', vehicle.title, import 'conventional_box_truck.spec.libsonnet'))
