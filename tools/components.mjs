// The components a built model comes apart into: the part nodes of a construct export, each mounted on another at a
// named site (tools/packages/thing-export/src/mounts.ts, partMounts). The showcase and the review sheets show such a
// model apart, as they show a vehicle's parts.
import { glbJson } from './glb.mjs';

// The part ids of a model's components, in node order, or undefined when it does not come apart: when no part declares
// a mount, or when its parts are skinned, since a skinned part follows its joints and moving its node moves nothing.
export function modelComponents(buffer) {
  const gltf = glbJson(buffer);
  if (gltf.skins) return undefined;
  const root = gltf.nodes[gltf.scenes[gltf.scene ?? 0].nodes[0]];
  const parts = (root.children ?? []).map((index) => gltf.nodes[index]).filter(({ extras }) => extras?.part !== undefined);
  return parts.some(({ extras }) => extras.mount) ? parts.map(({ extras }) => extras.part) : undefined;
}
