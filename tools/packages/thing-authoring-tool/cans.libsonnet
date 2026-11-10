local defaults = import 'models/measures/cans.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, massKg, dimensions, finish, solid, exportMass, turn=[0, -90, -90], roll=0) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'body', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: 'body', solid: solid, fraction: [0.5, 0.5, 0.5], turn: turn, hold: 'upright', roll: roll },
};
local tin(id, radius, height, label, serving, exportMass, massKg, food=defaults.tin.finish.food) =
  local d = defaults.tin;
  atom(id, 'openTin', massKg, {
    radius: radius, height: height, serving: serving,
    labelHeight: height * d.share.labelHeight, foodDepth: height * d.share.foodDepth,
  } + d.size, d.finish + { label: label, food: food }, 'wall', exportMass);
{ atom: atom, tin: tin }
