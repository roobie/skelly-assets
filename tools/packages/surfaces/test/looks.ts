import { parse, record, string } from 'valibot';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { type Surface, SurfaceSchema } from '../src/schema.ts';

/** The looks `models/surfaces.libsonnet` ships, parsed, by name. */
export const LOOKS: Readonly<Record<string, Surface>> = parse(
  record(string(), SurfaceSchema),
  JSON.parse(evaluateJsonnet("(import 'models/surfaces.libsonnet').looks")),
);

/** A shipped look of `kind`, for a test that needs one of each. */
export const lookOf = <K extends Surface['kind']>(kind: K) => {
  const look = Object.values(LOOKS).find((surface) => surface.kind === kind);
  if (look === undefined) throw new Error(`no ${kind} look in models/surfaces.libsonnet`);
  return look as Extract<Surface, { kind: K }>;
};
