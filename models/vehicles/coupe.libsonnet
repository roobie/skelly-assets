local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet')('coupe', import 'coupe.spec.libsonnet'))
