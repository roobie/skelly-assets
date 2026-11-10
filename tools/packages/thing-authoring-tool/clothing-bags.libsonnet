local poses = import 'models/measures/handling.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, massKg, dimensions, finish, solid='body', taxonomy=null) = {
  id: id,
  exportMass: 'parts',
  parts: [{ id: id, family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: poses.inHand + { part: id, solid: solid },
} + (if taxonomy == null then {} else { taxonomy: taxonomy });
local garment(id, massKg, style, body, trim, dimensions, taxonomy) = atom(
  id,
  'folded-garment',
  massKg,
  { style: style } + dimensions,
  { body: body, trim: trim },
  taxonomy=taxonomy,
);
{ atom: atom, garment: garment }
