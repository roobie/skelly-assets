local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet')('classic_4x4', import 'classic_4x4.spec.libsonnet'))
