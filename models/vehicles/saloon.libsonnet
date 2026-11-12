local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local s = import 'saloon.spec.libsonnet';
local vehicle = import 'saloon.placements.libsonnet';
local electric = import 'electric_saloon.placements.libsonnet';
local hybrid = import 'hybrid_saloon.placements.libsonnet';
local body = (import 'car-body.libsonnet').rows;
// The noses of the two cars derived from this one: this file is what the thing tool indexes for them.
local nose(id, title, over) = [row for row in body(id, title, s + over) if row.id == id + '_front_bumper'];
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, body('saloon', vehicle.title, s)
  + nose('electric_saloon', electric.title, { blankNose: true, noseAccent: 'plastic-green' })
  + nose('hybrid_saloon', hybrid.title, { grilleShut: 0.45, noseAccent: 'plastic-green' }))
