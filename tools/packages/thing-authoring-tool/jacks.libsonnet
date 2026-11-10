local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local tool(id, family, massKg, dimensions, finish) = {
  id: id,
  exportMass: 'parts',
  parts: [{ id: 'jack', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
};
{ tool: tool }
