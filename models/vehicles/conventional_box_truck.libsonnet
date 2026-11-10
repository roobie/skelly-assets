local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local t = import 'truck-cab.libsonnet';
// The box and its doors are the box truck's own, placed behind this cab; only the cab and chassis are pressed here.
taxonomy.inherit({ tags: { 'vehicle-body': ['truck'] } }, t.rows('conventional_box_truck', import 'conventional_box_truck.spec.libsonnet'))
