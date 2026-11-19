local frame = import 'frame.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'panel_van.spec.libsonnet';
local vehicle = import 'panel_van.placements.libsonnet';
frame.vehicleRows({ tags: { 'vehicle-body': ['van'] } }, van.rows('panel_van', vehicle.title, s) + [van.grillePanel(s)] + van.cabRows)
