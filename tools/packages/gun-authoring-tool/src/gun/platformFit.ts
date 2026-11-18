import { portMismatches } from '@skelly/construct/assembly/rules.ts';
import type { PortDef } from '@skelly/construct/assembly/schema.ts';

/** A port of a gun design, with the platform its design names and its ports stamped by `withPlatformPorts`. */
export interface FitSide {
  readonly platform: string;
  /** The port as "part.port", for messages. */
  readonly name: string;
  readonly port: PortDef;
}

/**
 * Why a component, met at its interface port, cannot go on a site of another design; empty when it fits. Parts swap
 * only within one platform, and there the interfaces must meet as they would in one assembly, size class included.
 */
export const fitMismatches = (component: FitSide, site: FitSide): string[] => [
  ...(component.platform === site.platform
    ? []
    : [`${component.name} is a ${component.platform} part but ${site.name} is on a ${site.platform} gun.`]),
  ...portMismatches(component.port, site.port, [component.name, site.name]),
];
