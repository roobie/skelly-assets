local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local part(id, family, massKg, dimensions, finish, grip, exportMass) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'part', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: 'part', solid: grip.solid, fraction: grip.fraction, turn: [0, -90, 0], hold: grip.hold, roll: 0 },
};
{ part: part }
