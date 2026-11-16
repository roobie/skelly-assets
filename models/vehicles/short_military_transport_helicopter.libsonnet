local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local vehicle = import 'short_military_transport_helicopter.placements.libsonnet';
local s = import 'short_military_transport_helicopter.spec.libsonnet';
taxonomy.inherit({ tags: { 'vehicle-body': ['helicopter'] } },
                 (import 'military-helicopter-body.libsonnet').rows('short_military_transport_helicopter', vehicle.title, s))
