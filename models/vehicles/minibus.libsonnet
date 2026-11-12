local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local vehicle = import 'minibus.placements.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, (import 'van-body.libsonnet').rows('minibus', vehicle.title, import 'minibus.spec.libsonnet'))
