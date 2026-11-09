local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local equipment(id, family, massKg, dimensions, finish, heldSolid, turn=[0, 0, 0], fraction=[0.5, 0.5, 0.5], hold='forward') = {
  id: id,
  exportMass: 'parts',
  parts: [{ id: 'equipment', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: 'equipment', solid: heldSolid, fraction: fraction, turn: turn, hold: hold, roll: 0 },
};
{ equipment: equipment }
