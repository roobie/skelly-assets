local poses = import 'models/measures/handling.libsonnet';
local defaults = import 'models/measures/packages.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local package(id, family, massKg, dimensions, finish, exportMass, heldSolid='body') = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'package', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  handling: poses.inHand + { part: 'package', solid: heldSolid },
};
local carton(id, massKg, width, height, depth, body, label, exportMass, extra={}, heldSolid='body') =
  local d = defaults.carton;
  package(id, 'carton', massKg, {
    width: width, height: height, depth: depth,
    bandHeight: height * d.share.bandHeight, handleWidth: width * d.share.handleWidth, handleDepth: depth * d.share.handleDepth,
  } + d.size + extra, { body: body, label: label, cap: body }, exportMass, heldSolid);
local vessel(id, massKg, radius, height, body, label, exportMass, extra={}) =
  local d = defaults.vessel;
  package(id, 'vessel', massKg, {
    radius: radius, height: height, neckRadius: radius, capRadius: radius + d.capOverhang,
    bandHeight: height * d.share.bandHeight,
  } + d.size + extra, d.finish + { body: body, label: label }, exportMass);
{ carton: carton, vessel: vessel }
