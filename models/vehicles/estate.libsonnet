local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local vehicle = import 'estate.placements.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('estate', vehicle.title, import 'estate.spec.libsonnet'))
