local poses = import 'models/measures/handling.libsonnet';
local params(values) = { [key]: if std.type(values[key]) == 'array' then std.manifestJson(values[key]) else std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, exportMass, massKg, dimensions, finish, solid='body', fraction=poses.material.fraction, turn=poses.material.turn) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'material', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: poses.material + { part: 'material', solid: solid, fraction: fraction, turn: turn },
};
{ atom: atom }
