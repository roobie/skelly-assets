local params(values) = { [key]: if std.type(values[key]) == 'array' then std.manifestJson(values[key]) else std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, exportMass, massKg, dimensions, finish, solid='body', fraction=[0.5, 0.5, 0.5], turn=[0, 0, 0]) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'material', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: 'material', solid: solid, fraction: fraction, turn: turn, hold: 'upright', roll: 0 },
};
{ atom: atom }
