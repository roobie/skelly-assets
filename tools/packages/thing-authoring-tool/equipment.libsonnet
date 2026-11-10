local poses = import 'models/measures/handling.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local equipment(id, family, massKg, dimensions, finish, heldSolid,
                   turn=poses.equipment.turn, fraction=poses.equipment.fraction, hold=poses.equipment.hold) = {
  id: id,
  exportMass: 'parts',
  parts: [{ id: 'equipment', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: poses.equipment + { part: 'equipment', solid: heldSolid, fraction: fraction, turn: turn, hold: hold },
};
{ equipment: equipment }
