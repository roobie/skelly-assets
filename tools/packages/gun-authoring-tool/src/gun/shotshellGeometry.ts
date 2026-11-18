// Sourced external dimensions, in millimetres. Internal construction is visual, not cartridge data.

import type { ExtrudedPolygonSolid, RevolvedSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { MATERIALS } from '@skelly/thing-core/materials';
import appearance from '../../../../../models/guns/tables/appearance.json' with { type: 'json' };
import type { Measure, Shotshell } from '../ammo/cartridge.ts';
import { primerPocket, primerProfile } from '../ammo/roundProfile.ts';
import { SHOTSHELL_PRIMER } from '../ammo/roundShape.ts';
import { revolvedRound } from './revolvedRound.ts';

type ShotshellSolid = RevolvedSolid | ExtrudedPolygonSolid;

/** Visual approximation only: the cartridge format has no hull wall thickness. */
const SHOTSHELL_WALL_MM = 0.65;
/** Visual edge chamfer, matching the metallic cartridge's profile-based bevel style. */
const SHOTSHELL_EDGE_MM = 0.12;
/** Presentation proxy: rolled lip depth and inward curl, not a manufacturer measurement. */
const ROLL_CRIMP_PROXY_MM = 1.2;
/** Presentation proxy for a fold crimp: six leaves and narrow visible seams. */
const FOLD_CRIMP_LEAVES = 6;
/** Unknown closure uses the authorised conservative roll-crimp visual proxy; source stays null. */
const UNKNOWN_CLOSURE_PROXY = 'roll-crimp' as const;

const required = (measure: Measure, name: string): number => {
  if (measure.value === null) {
    throw new Error(`shotshell has no ${name}`);
  }
  return measure.value;
};

export interface ShotshellGeometry {
  readonly round: readonly ShotshellSolid[];
  readonly case: readonly ShotshellSolid[];
}

/**
 * The same profiles feed viewer and common cartridge GLB exporter. The primer is drawn to a modelling assumption
 * (`SHOTSHELL_PRIMER`), so the shell's sourced primer stays unknown.
 */
export const shotshellGeometry = (shell: Shotshell): ShotshellGeometry => {
  const radius = required(shell.hull.outerDiameter, 'hull diameter') / 2;
  const rim = required(shell.head.rimDiameter, 'rim diameter') / 2;
  const rimThickness = required(shell.head.rimThickness, 'rim thickness');
  const headHeight = required(shell.head.height, 'head height');
  const loaded = required(shell.length.loaded, 'loaded length');
  const fired = required(shell.length.nominal, 'fired length');
  const inner = radius - SHOTSHELL_WALL_MM;
  const edge = SHOTSHELL_EDGE_MM;
  const pocket: Vec2[] = SHOTSHELL_PRIMER === null ? [[0, 0]] : primerPocket(SHOTSHELL_PRIMER);
  const primer = SHOTSHELL_PRIMER === null ? [] : [revolvedRound('primer', primerProfile(SHOTSHELL_PRIMER), 'primer')];
  const head = revolvedRound(
    'head',
    [
      ...pocket,
      [0, rim - edge],
      [edge, rim],
      [rimThickness - edge, rim],
      [rimThickness, rim - edge],
      [rimThickness, radius],
      [headHeight, radius],
      [headHeight, 0],
      pocket[0]!,
    ],
    'case',
  );
  const tube = (length: number): Vec2[] => [
    [headHeight, radius],
    [length - edge, radius],
    [length, radius - edge],
    [length, inner + edge],
    [length - edge, inner],
    [headHeight, inner],
    [headHeight, radius],
  ];
  const closure = shell.closure.value ?? UNKNOWN_CLOSURE_PROXY;
  const curl = ROLL_CRIMP_PROXY_MM;
  const loadedHull: Vec2[] =
    closure === 'roll-crimp'
      ? [
          [headHeight, radius],
          [loaded - curl, radius],
          [loaded - edge, radius - edge],
          [loaded, radius - curl / 2],
          [loaded - edge, radius - curl],
          [loaded - curl, radius - curl],
          [loaded - curl, inner],
          [headHeight, inner],
          [headHeight, radius],
        ]
      : tube(loaded);
  // A generic inset closure card, not pellets/wad geometry or a measured Federal component.
  const cardX = loaded - curl;
  const card = revolvedRound(
    'closure-card',
    [
      [cardX - edge, 0],
      [cardX - edge, inner],
      [cardX, inner],
      [cardX, 0],
      [cardX - edge, 0],
    ],
    'closure',
  );
  const leaves: ExtrudedPolygonSolid[] = [];
  if (closure === 'fold-crimp') {
    for (let i = 0; i < FOLD_CRIMP_LEAVES; i++) {
      const a = (i * Math.PI * 2) / FOLD_CRIMP_LEAVES + 0.025;
      const b = ((i + 1) * Math.PI * 2) / FOLD_CRIMP_LEAVES - 0.025;
      leaves.push({
        id: `fold-${i}`,
        kind: 'extruded-polygon',
        axis: 'x',
        profile: [
          [0, 0],
          [inner * Math.cos(a), inner * Math.sin(a)],
          [inner * Math.cos(b), inner * Math.sin(b)],
        ],
        z: [loaded - edge * 3, loaded - edge * 2],
        slot: 'hull',
        display: { bevel: false, outline: false },
      });
    }
  }
  return {
    round: [head, ...primer, revolvedRound('hull', loadedHull, 'hull'), card, ...leaves],
    case: [head, ...primer, revolvedRound('hull', tube(fired), 'hull')],
  };
};

export const shotshellHullMaterial = (shell: Shotshell): string => {
  const name = shell.hull.colors.find((entry) => entry.value !== null)?.value;
  const materials: Readonly<Record<string, string>> = appearance.hullMaterials;
  const material = name === undefined || name === null ? undefined : materials[name];
  if (!(material && Object.hasOwn(MATERIALS, material))) {
    throw new Error(`shotshell has no supported sourced hull colour: ${String(name)}`);
  }
  return material;
};
