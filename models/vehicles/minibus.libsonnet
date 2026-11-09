local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, (import 'van-body.libsonnet').rows('minibus', import 'minibus.spec.libsonnet'))
