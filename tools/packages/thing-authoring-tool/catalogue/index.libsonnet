local worn = import 'worn.libsonnet';
(import 'ground.libsonnet') + std.flattenArrays([worn[id].rows for id in std.objectFields(worn)])
