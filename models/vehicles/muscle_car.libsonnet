local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, (import 'car-body.libsonnet')('muscle_car', import 'muscle_car.spec.libsonnet'))
