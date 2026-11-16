import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly, PartAppearance, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { drawnGeometry } from '@skelly/thing-export/drawn.ts';
import type { GlbAssetIdentity, GlbExportError, VoxelGrains } from '@skelly/thing-export/exportTypes.ts';
import { modelCollision } from '@skelly/thing-export/physical.ts';
import { ATTACHMENT_FAMILIES } from './attachmentParts.ts';
import { attachmentInstanceForId, attachmentMetadata, attachmentMountPort } from './attachments.ts';
import { gunDomain } from './domain.ts';
import { inFileFrame } from './exportFrame.ts';
import type { DeadvoxModelEntry, DeadvoxModelFile } from './exportGlb.ts';
import { exportGunModels } from './glbWriter.ts';
import { GUN_PALETTE } from './palette.ts';
import { FAMILIES } from './parts.ts';

export type AttachmentExportResult =
  | {
      readonly ok: true;
      readonly glb: Uint8Array;
      readonly smoothGlb: Uint8Array;
      readonly partNodes: readonly string[];
      readonly modelEntry: DeadvoxModelEntry;
    }
  | { readonly ok: false; readonly error: GlbExportError };

/** Exports one attachment part at its mount base as a standalone loot/item model. */
export const exportAttachmentGlb = (
  id: string,
  asset: GlbAssetIdentity,
  appearance?: PartAppearance,
  voxel: Partial<VoxelGrains> = {},
): AttachmentExportResult => {
  const instance = attachmentInstanceForId(id, appearance);
  const family = FAMILIES[instance.family] ?? ATTACHMENT_FAMILIES[instance.family];
  if (!family) {
    throw new Error(`Attachment ${id} has no part family`);
  }
  const assembly: Assembly = {
    name: asset.id,
    root: id,
    parts: { [id]: instance },
    connections: [],
  };
  // Preserve authored mount frames, but an item model is not an incomplete gun assembly.
  const standaloneFamily: PartFamily = {
    ...family,
    build: (partParams) => {
      const part = family.build(partParams);
      return { ...part, ports: part.ports.map((port) => ({ ...port, required: false })) };
    },
  };
  const domain = {
    ...gunDomain,
    families: { ...gunDomain.families, [instance.family]: standaloneFamily },
    axisRules: [],
    rules: [],
  };
  const resolved = resolve(assembly, domain);
  const part = resolved.defs.get(id);
  const metadata = attachmentMetadata(instance.family, instance.params, domain.units.metresPerUnit, part);
  if (!metadata) {
    throw new Error(`Attachment ${id} has no game metadata`);
  }
  const rootMount = attachmentMountPort(part, metadata.mount)!.id;
  const fileResolved = inFileFrame(resolved);
  const drawn = drawnGeometry(fileResolved, voxel);
  const result = exportGunModels({
    resolved,
    palette: GUN_PALETTE,
    asset,
    rootMount,
    ...voxel,
    drawnVoxels: drawn.voxels,
  });
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    glb: result.glb,
    smoothGlb: result.smoothGlb,
    partNodes: result.partNodes,
    modelEntry: {
      id: asset.id,
      file: asset.file as DeadvoxModelFile,
      collision: modelCollision(fileResolved, drawn),
      gun: { attachment: metadata },
    },
  };
};
