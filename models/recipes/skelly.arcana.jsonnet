local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
taxonomy.inherit({ tags: { setting: ['fantasy'] } }, (import 'models/catalogue/packs.libsonnet').recipe('skelly.arcana'))
