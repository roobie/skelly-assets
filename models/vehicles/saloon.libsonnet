local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local s = import 'saloon.spec.libsonnet';
local body = (import 'car-body.libsonnet').rows;
// The noses of the two cars derived from this one: this file is what the thing tool indexes for them.
local nose(id, over) = [row for row in body(id, s + over) if row.id == id + '_front_bumper'];
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, body('saloon', s)
  + nose('electric_saloon', { blankNose: true, noseAccent: 'plastic-green' })
  + nose('hybrid_saloon', { grilleShut: 0.45, noseAccent: 'plastic-green' }))
