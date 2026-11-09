local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local package(id, family, massKg, dimensions, finish, exportMass, heldSolid='body') = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'package', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: { part: 'package', solid: heldSolid, fraction: [0.5, 0.5, 0.5], turn: [0, -90, -90], hold: 'upright', roll: 0 },
};
local carton(id, massKg, width, height, depth, body, label, exportMass, extra={}, heldSolid='body') = package(id, 'carton', massKg, {
  width: width, height: height, depth: depth, lidHeight: 0.002,
  bandHeight: height * 0.45, bandInset: 0.0003,
  handleHeight: 0, handleWidth: width * 0.6, handleDepth: depth * 0.25, handleWall: 0.006,
} + extra, { body: body, label: label, cap: body }, exportMass, heldSolid);
local vessel(id, massKg, radius, height, body, label, exportMass, extra={}) = package(id, 'vessel', massKg, {
  radius: radius, height: height, shoulderHeight: 0.002, neckRadius: radius,
  neckHeight: 0.001, capRadius: radius + 0.0005, capHeight: 0.001,
  rimHeight: 0.001, bandHeight: height * 0.65, bandInset: 0.0003,
} + extra, { body: body, label: label, cap: 'steel-grey' }, exportMass);
{ carton: carton, vessel: vessel }
