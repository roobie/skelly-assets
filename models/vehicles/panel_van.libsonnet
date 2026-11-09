local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'panel_van.spec.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, van.rows('panel_van', s) + [van.grillePanel(s)])
