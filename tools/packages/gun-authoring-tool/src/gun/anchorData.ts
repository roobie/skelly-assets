// Frames derive from built geometry, following parameter changes without duplicating builder constants.
// Declarations are keyed by registry key; a grip's frame follows its own leaned axes after placement.

import type { AnchorFrame } from '@skelly/construct/assembly/anchors.ts';
import { extrusionPoint, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import type { GunAnchorDeclarations } from './anchors.ts';
import { AR_MODULAR_ANCHORS } from './arModular/index.ts';
import { FIRING_GRIP } from './firingGrip.ts';
import {
  axisMidpoint,
  ejectionAnchor,
  findSolid,
  frameAt,
  gripHold,
  interiorPoint,
  magwellAnchor,
  muzzlePortAnchor,
  rearFaceButt,
  undersideSupport,
  X,
  Y,
} from './partAnchors.ts';
import { REVOLVER_GRIP_RAKE_DEGREES } from './revolver.ts';
import { sporterSupport } from './sporter.ts';

const revolverGripAxes = (): Pick<AnchorFrame, 'forward' | 'up'> => {
  const rake = (REVOLVER_GRIP_RAKE_DEGREES * Math.PI) / 180;
  return {
    forward: [Math.cos(rake), -Math.sin(rake), 0],
    up: [Math.sin(rake), Math.cos(rake), 0],
  };
};

/** Existing ordinary grip placement; authored palm datums take precedence for curved stocks. */
const gripHoldPoint = (s: Solid): Vec3 => {
  if (s.kind === 'box') {
    return s.box.center;
  }
  if (s.kind === 'revolved') {
    return axisMidpoint(s);
  }
  const n = s.profile.length;
  const centroid: readonly [number, number] = [
    s.profile.reduce((sum, vertex) => sum + vertex[0], 0) / n,
    s.profile.reduce((sum, vertex) => sum + vertex[1], 0) / n,
  ];
  if (s.axis === 'y') {
    return extrusionPoint(s.axis, centroid, s.z[0]);
  }
  const lowestProfileAxis = s.axis === 'x' ? 0 : 1;
  const lowest = s.profile.reduce((best, vertex) =>
    vertex[lowestProfileAxis]! < best[lowestProfileAxis]! ? vertex : best,
  );
  const blendedProfile: readonly [number, number] = [
    lowest[0] * 0.99 + centroid[0] * 0.01,
    lowest[1] * 0.99 + centroid[1] * 0.01,
  ];
  return extrusionPoint(s.axis, blendedProfile, (s.z[0] + s.z[1]) / 2);
};

export const GUN_ANCHORS: GunAnchorDeclarations = {
  // Separate grip: local frame is the grip's own, so its lean comes from the mounting port.
  grip: {
    holdRank: 'grip',
    anchors: gripHold(['body-upper', 'body'], () => ({ forward: X, up: Y })),
  },
  'revolver-grip': {
    holdRank: 'grip',
    anchors: gripHold(['grip-core'], revolverGripAxes),
  },
  'revolver-barrel': { anchors: muzzlePortAnchor },
  // Integrated pistol grip: the grip was rotated into the frame's coordinates; its magazine port carries
  // that rotation (grip local -Y is the port normal, grip local X is the port up).
  frame: {
    holdRank: 'grip',
    anchors: (params, part) => {
      const hold = gripHold(['body-upper', 'body'], (framePart) => {
        const magazine = framePart.ports.find((port) => port.id === 'magazine');
        return magazine
          ? { forward: magazine.up, up: [-magazine.normal[0], -magazine.normal[1], -magazine.normal[2]] }
          : { forward: X, up: Y };
      })(params, part);
      const magazine = part.ports.find((port) => port.id === 'magazine');
      return { ...hold, ...(magazine ? { magwell: frameAt(magazine.pos) } : {}) };
    },
  },
  // Every stock has a butt; only a firing-grip stock has a hold. An authored palm datum is independent
  // of the stock's lowest silhouette vertex; ordinary wrists use their interior.
  stock: {
    holdRank: 'firing-grip-stock',
    anchors: (_params, part) => {
      const gripSolid = part.solids.find((solid) => solid.id === 'grip');
      const grip = gripSolid ?? findSolid(part, 'wrist');
      const palm = part.axes.find((a) => a.kind === 'firing-grip');
      const position = palm?.origin ?? (grip && (gripSolid ? gripHoldPoint(grip) : interiorPoint(grip)));
      return {
        ...rearFaceButt(part),
        ...(position && part.tags?.includes(FIRING_GRIP) ? { hold: frameAt(position) } : {}),
      };
    },
  },
  'recoil-stock': { anchors: (_params, part) => rearFaceButt(part) },
  handguard: {
    anchors: (params, part) =>
      params.section === 'sporter' && params.style !== 'plank'
        ? { support: frameAt(sporterSupport(part.ports.find((port) => port.id === 'front')!.pos[0])) }
        : undersideSupport(part, 0.6),
  },
  forend: { anchors: (_params, part) => undersideSupport(part, 0.5) },
  lower: { anchors: magwellAnchor },
  barrel: { anchors: muzzlePortAnchor },
  'muzzle-brake': { anchors: muzzlePortAnchor },
  ...AR_MODULAR_ANCHORS,
  receiver: {
    anchors: (params, part) => {
      const mouth = part.keepOuts.find(
        (volume) => volume.id === (params.feed === 'top' ? 'loading-mouth' : 'loading-port'),
      );
      return {
        ...ejectionAnchor(params, part),
        ...(mouth
          ? {
              loading_port: frameAt([
                mouth.box.center[0],
                mouth.box.center[1] + mouth.box.half[1],
                mouth.box.center[2],
              ]),
            }
          : {}),
      };
    },
  },
  'ak-receiver': { anchors: ejectionAnchor },
  slide: { anchors: ejectionAnchor },
};
