local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, massKg, dimensions, finish, exportMass) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'body', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: 'body', solid: 'body', fraction: [0.5, 0.5, 0.5], turn: [0, -90, -90], hold: 'upright', roll: 0 },
};
{ atom: atom }
