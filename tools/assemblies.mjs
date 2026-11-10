// The assemblies the kits build, each laid out on its own as its kit fits it to a vehicle, so a review can draw and
// explode one apart from any vehicle: an engine, a turret, a radiator or a fuel tank as its core with every fitting at
// its own site (models/vehicles/assembly.libsonnet), a wheel with its brake (models/vehicles/wheel-kit.libsonnet), and
// an exhaust as its pipes and parts along its run (models/vehicles/exhaust-kit.libsonnet). Each is
// named after the part it fits fused, with ASSEMBLY_SUFFIX, so it never takes a model's id.
import { resolve } from 'node:path';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { toModelFrame } from './packages/thing-core/src/frame.ts';

const repo = resolve(import.meta.dirname, '..');
export const ASSEMBLY_SUFFIX = '_assembly';

// Each assembly's sites about the origin of its own frame, turned into the model frame as a vehicle's placements are
// (tools/placements.mjs), as { id, sites: [{ id, part, at }] }. A wheel's far twin and its brake's are the near side
// reflected, so only the near side is laid out. An exhaust has no core, so it is laid out about its front pipe, the
// part that meets the engine.
export function readAssemblies(root = repo) {
  const { forward, assemblies } = JSON.parse(evaluateJsonnet(`
  local frame = import 'models/vehicles/frame.libsonnet';
  local site = import 'models/vehicles/site.libsonnet';
  local wheelKit = import 'models/vehicles/wheel-kit.libsonnet';
  local wheels = import 'models/vehicles/wheels.libsonnet';
  local cored = [
    import 'models/vehicles/engine-kit.libsonnet',
    import 'models/vehicles/turret-kit.libsonnet',
    import 'models/vehicles/cooling-kit.libsonnet',
    import 'models/vehicles/fuel-tank-kit.libsonnet',
  ];
  local exhaustKit = import 'models/vehicles/exhaust-kit.libsonnet';
  local origin = [0, 0, 0];
  local near = '_near';
  local isNear(placed) = std.endsWith(placed.id, near);
  local plain(placed) = placed { id: std.substr(placed.id, 0, std.length(placed.id) - std.length(near)) };
  local assemblies = [
    { id: kit.sites(name, origin, 'fused')[0].part + '${ASSEMBLY_SUFFIX}', sites: kit.sites(name, origin, 'assembly') }
    for kit in cored
    for name in kit.names
  ] + [
    { id: name + '${ASSEMBLY_SUFFIX}', sites: [plain(placed) for placed in wheelKit.pair(site.kit, 'wheel', name, origin) if isNear(placed)] }
    for name in std.objectFields(wheels)
  ] + [
    local sites = exhaustKit.sites(name, origin, 'assembly');
    local first = sites[0].at;
    { id: name + '${ASSEMBLY_SUFFIX}', sites: [placed { at: [placed.at[i] - first[i] for i in [0, 1, 2]] } for placed in sites] }
    for name in exhaustKit.names
  ];
  { forward: frame.forward, assemblies: assemblies }`, root));
  const turned = (sites) => sites.map((placed) => ({ ...placed, at: toModelFrame(forward, placed.at) }));
  return assemblies.map(({ id, sites }) => ({ id, sites: turned(sites) }));
}
