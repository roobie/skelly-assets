local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local vehicle = import 'classic_4x4.placements.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet').rows('classic_4x4', vehicle.title, import 'classic_4x4.spec.libsonnet'))
