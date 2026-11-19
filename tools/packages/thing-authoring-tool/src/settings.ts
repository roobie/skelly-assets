// The catalogue's settings from their own twin, which holds no row, so a consumer of the settings alone loads and checks
// no catalogue; see `item-settings.jsonnet`.
import settingsJson from '../item-settings.json' with { type: 'json' };
import { loadSettings } from './catalogue.ts';

export const settings = loadSettings(settingsJson);
