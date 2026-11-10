import type { ExportMount, ExportPortMetadata } from '@skelly/thing-export/exportTypes.ts';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { exportGunGlb } from '../src/gun/exportGlb.ts';
import { type GltfJson, readGlb } from './glbReader.ts';
import { loadDesigns } from './helpers.ts';

const CLOSE = 1e-6;

type Node = GltfJson['nodes'][number];
interface Component {
  readonly node: Node;
  readonly mount?: ExportMount;
  readonly meets: readonly ExportMount[];
}
/** A port node where the file puts it, its frame's axes as the reader sees them: x the normal, y the up. */
interface PortInFile {
  readonly at: Vector3;
  readonly normal: Vector3;
  readonly up: Vector3;
  readonly pitch: number;
}

const local = ({ translation = [0, 0, 0], rotation = [0, 0, 0, 1] }: Node): Matrix4 =>
  new Matrix4().compose(
    new Vector3(...(translation as [number, number, number])),
    new Quaternion(...(rotation as [number, number, number, number])),
    new Vector3(1, 1, 1),
  );

/** Each part node under the root, by part id, and each port node where the file puts it, by port id. */
const readComponents = (glb: Uint8Array) => {
  const { json } = readGlb(glb);
  const root = json.nodes[json.scenes[0]!.nodes[0]!]!;
  const { metresPerUnit } = (root.extras as { gungen: { metresPerUnit: number } }).gungen;
  const components = new Map<string, Component>();
  const ports = new Map<string, PortInFile>();
  for (const index of root.children ?? []) {
    const node = json.nodes[index]!;
    const extras = node.extras as {
      part: string;
      mount?: ExportMount;
      meets?: ExportMount[];
    };
    components.set(extras.part, {
      node,
      ...(extras.mount ? { mount: extras.mount } : {}),
      meets: extras.meets ?? [],
    });
    for (const child of node.children ?? []) {
      const portNode = json.nodes[child]!;
      const port = (portNode.extras as { port: ExportPortMetadata }).port;
      const world = local(node).multiply(local(portNode));
      const axes = [new Vector3(), new Vector3(), new Vector3()] as const;
      world.extractBasis(...axes);
      ports.set(port.id, {
        at: new Vector3().setFromMatrixPosition(world),
        normal: axes[0],
        up: axes[1],
        pitch: (port.slots?.pitch ?? 0) * metresPerUnit,
      });
    }
  }
  return { components, ports };
};

const slotted = (port: PortInFile, slot = 0): Vector3 => port.at.clone().addScaledVector(port.up, slot * port.pitch);

const exportsOfCorpus = () =>
  loadDesigns().map(({ label, assembly, items }) => {
    const result = exportGunGlb(assembly, { id: 'fixture_gun', file: 'assets/models/fixture_gun.glb' }, {}, { items });
    if (!result.ok) {
      throw new Error(`${label}: ${JSON.stringify(result.error)}`);
    }
    return { label, root: assembly.root, glb: result.glb };
  });

describe.each(exportsOfCorpus())('$label comes apart into components', ({ root, glb }) => {
  const { components, ports } = readComponents(glb);

  it('mounts every component but the root on a site, and following the mounts from any component reaches the root', () => {
    for (const [part, { mount }] of components) {
      if (part === root) {
        expect(mount).toBeUndefined();
        continue;
      }
      const seen = new Set([part]);
      let at = part;
      while (at !== root) {
        const site = components.get(at)?.mount?.site.split('.')[0];
        expect(site, `${at} has a mount`).toBeDefined();
        expect(seen.has(site!), `${part} mounts in a loop`).toBe(false);
        seen.add(site!);
        at = site!;
      }
    }
  });

  it('meets every site at its interface in the file: one point, opposed normals, the up turned by the roll', () => {
    for (const [part, { mount, meets }] of components) {
      for (const joint of [...(mount ? [mount] : []), ...meets]) {
        const site = ports.get(joint.site);
        const face = ports.get(joint.interface);
        expect(site && face, `${part}: ${joint.site} and ${joint.interface} are port nodes`).toBeTruthy();
        expect(joint.interface.startsWith(`${part}.`)).toBe(true);
        expect(slotted(site!, joint.slot).distanceTo(slotted(face!, joint.interfaceSlot))).toBeLessThan(CLOSE);
        expect(site!.normal.dot(face!.normal)).toBeCloseTo(-1, 6);
        const turned = site!.up.clone().applyAxisAngle(site!.normal, ((joint.roll ?? 0) * Math.PI) / 180);
        expect(turned.dot(face!.up)).toBeCloseTo(1, 6);
      }
    }
  });
});
