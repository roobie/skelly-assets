import type { GlbExportInput, GlbExportResult, ModelGlbsResult } from '@skelly/thing-export/exportTypes.ts';
import { exportGlb, exportModelGlbs } from '@skelly/thing-export/glb.ts';
import { inFileFrame } from './exportFrame.ts';

const GUN_GENERATOR = 'skelly gungen glb export';

/**
 * Supplies Gungen's persisted GLB identity to the domain-neutral geometry writer, and writes the gungen-frame assembly
 * it is given in the file's axes, so every gungen file takes the export frame's one turn.
 */
type GunGeometryInput = Omit<GlbExportInput, 'generator' | 'metadataNamespace'>;

const gunFileInput = (input: GunGeometryInput): GlbExportInput => ({
  ...input,
  resolved: inFileFrame(input.resolved),
  generator: GUN_GENERATOR,
  metadataNamespace: 'gungen',
});

export const exportGunGeometry = (input: GunGeometryInput): GlbExportResult => exportGlb(gunFileInput(input));

/** A shipped gungen model's file and its smooth copy; see `@skelly/thing-export/glb.ts`, `exportModelGlbs`. */
export const exportGunModels = (input: GunGeometryInput): ModelGlbsResult => exportModelGlbs(gunFileInput(input));
