local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local vehicle = import 'high_roof_van.placements.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, (import 'van-body.libsonnet').rows('high_roof_van', vehicle.title, import 'high_roof_van.spec.libsonnet'))
