import data from '../../../../../models/mobs/materialTemplates.json' with { type: 'json' };
import type { Template } from '../core/template.ts';

type MaterialContent = Pick<Template, 'materials'> & { readonly materialHsl: NonNullable<Template['materialHsl']> };
const content = data as unknown as Readonly<Record<'humanoid' | 'dog', MaterialContent>>;
export const humanoidMaterials = content.humanoid.materials;
export const humanoidMaterialHsl = content.humanoid.materialHsl;
export const dogMaterials = content.dog.materials;
export const dogMaterialHsl = content.dog.materialHsl;
