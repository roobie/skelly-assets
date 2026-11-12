import type { Assembly } from '@skelly/construct/assembly/schema.ts';
import type { TEMPLATES } from '../gun/templates.ts';

// Keep the selected finish preset explicit across file boundaries; never encode it in the generated name.
export const generatedAssemblyJson = (assembly: Assembly, template: (typeof TEMPLATES)[number]): string =>
  `${JSON.stringify(
    {
      ...assembly,
      ...(template.variant === undefined ? {} : { calibre: template.variant }),
      appearance: { appearanceProfile: template.name },
    },
    null,
    2,
  )}\n`;
