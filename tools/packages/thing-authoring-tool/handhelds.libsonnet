local defaults = import 'models/measures/keys.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, massKg, dimensions, finish, solid='body') = {
  id: id,
  exportMass: 'parts',
  parts: [{ id: id, family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: id, solid: solid, fraction: [0.5, 0.5, 0.5], turn: [0, -90, -90], hold: 'upright', roll: 0 },
};
local key(id, massKg, bowRadius, shaftLength, metal) = atom(id, 'key', massKg, {
  bowRadius: bowRadius, shaftLength: shaftLength,
} + defaults.key, { metal: metal }, 'shaft');
local melee(id, family, massKg, dimensions, finish) = {
  id: id,
  exportMass: 'parts',
  parts: [{ id: id, family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
};
local datum(id, solid, fraction) = { part: id, solid: solid, fraction: fraction };
local held(id, solid, fraction, hold='upright', roll=90) = {
  handling: datum(id, solid, fraction) + { turn: [0, 0, 0], hold: hold, roll: roll },
};
{ params: params, atom: atom, key: key, melee: melee, datum: datum, held: held }
