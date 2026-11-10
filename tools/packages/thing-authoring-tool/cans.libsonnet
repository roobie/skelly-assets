local poses = import 'models/measures/handling.libsonnet';
local defaults = import 'models/measures/cans.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local atom(id, family, massKg, dimensions, finish, solid, exportMass, turn=poses.inHand.turn, roll=poses.inHand.roll) = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'body', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: poses.inHand + { part: 'body', solid: solid, turn: turn, roll: roll },
};
local tin(id, radius, height, label, serving, exportMass, massKg, food=defaults.tin.finish.food) =
  local d = defaults.tin;
  atom(id, 'openTin', massKg, {
    radius: radius, height: height, serving: serving,
    labelHeight: height * d.share.labelHeight, foodDepth: height * d.share.foodDepth,
  } + d.size, d.finish + { label: label, food: food }, 'wall', exportMass);
{ atom: atom, tin: tin }
