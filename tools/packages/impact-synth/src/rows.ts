import content from '../../../../models/sounds/impacts.json' with { type: 'json' };
import { parseImpactRows } from './schema.ts';

/** The shipped impact rows by id, validated; their source is `models/sounds/impacts.jsonnet`. */
export const impactRows = parseImpactRows(content);
