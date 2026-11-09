local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, (import 'van-body.libsonnet').rows('high_roof_van', import 'high_roof_van.spec.libsonnet'))
