// The authored catalogue. Loading it parses and checks every item, so a build worker is handed its row's slice instead;
// see `exports.ts`, `thingTasks`.
import content from '../items.json' with { type: 'json' };
import { loadCatalogue } from './catalogue.ts';

export const catalogue = loadCatalogue(content);
