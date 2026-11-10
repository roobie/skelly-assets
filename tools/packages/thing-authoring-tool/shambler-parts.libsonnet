local poses = import 'models/measures/handling.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local part(id, family, massKg, dimensions, finish, grip, exportMass) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'part', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: poses.shamblerPart + { part: 'part', solid: grip.solid, fraction: grip.fraction, hold: grip.hold },
};
{ part: part }
