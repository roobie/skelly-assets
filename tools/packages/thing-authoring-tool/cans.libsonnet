local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, massKg, dimensions, finish, solid, exportMass, turn=[0, 0, -90], roll=0) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'body', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: 'body', solid: solid, fraction: [0.5, 0.5, 0.5], turn: turn, hold: 'upright', roll: roll },
};
local tin(id, radius, height, label, serving, exportMass, massKg, food='paint-terracotta') = atom(id, 'openTin', massKg, {
  radius: radius, height: height, wall: 0.0008, rimWidth: 0.0014,
  labelHeight: height * 0.68, labelThickness: 0.0003, stripeHeight: 0.003,
  hingeWidth: 0.012, hingeHeight: 0.004,
  serving: serving, foodDepth: height * 0.23, beanRadius: 0.006, beanCount: 6,
}, { body: 'steel-grey', label: label, stripe: 'paperboard-tan', food: food }, 'wall', exportMass);
{ atom: atom, tin: tin }
