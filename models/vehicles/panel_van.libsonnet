local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'panel_van.spec.libsonnet';
local vehicle = import 'panel_van.placements.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, van.rows('panel_van', vehicle.title, s) + [van.grillePanel(s)] + van.cabRows)
