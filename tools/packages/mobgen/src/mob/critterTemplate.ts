// The critter template, authored in `models/mobs/critterTemplate.jsonnet`. Like the dog it stays outside
// mob/templates.ts's TEMPLATES list, so Deadvox's enumerations never see it; the mob export opts in.

import { registerTemplate } from '../core/template.ts';
// Importing the plan registers it before the template can be consumed.
import { CRITTER_TEMPLATE } from './critter.ts';

export const critterTemplate = CRITTER_TEMPLATE;
registerTemplate(critterTemplate);
