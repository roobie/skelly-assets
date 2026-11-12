local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local vehicle = import 'coupe.placements.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('coupe', vehicle.title, import 'coupe.spec.libsonnet'))
