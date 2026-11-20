// Frames derive from built geometry, following parameter changes without duplicating builder constants.
// Declarations are keyed by registry key; a grip's frame follows its own leaned axes after placement.

import type { AnchorFrame } from '@skelly/construct/assembly/anchors.ts';
import type { GunAnchorDeclarations } from './anchors.ts';
import { AR_MODULAR_ANCHORS } from './arModular/index.ts';
import {
  ejectionAnchor,
  frameAt,
  gripHold,
  magwellAnchor,
  muzzlePortAnchor,
  rearFaceButt,
  stockAnchors,
  undersideSupport,
  X,
  Y,
} from './partAnchors.ts';
import { REVOLVER_GRIP_RAKE_DEGREES } from './revolver.ts';
import { SKS_ANCHORS } from './sks/index.ts';
import { sporterSupport } from './sporter.ts';

const revolverGripAxes = (): Pick<AnchorFrame, 'forward' | 'up'> => {
  const rake = (REVOLVER_GRIP_RAKE_DEGREES * Math.PI) / 180;
  return {
    forward: [Math.cos(rake), -Math.sin(rake), 0],
    up: [Math.sin(rake), Math.cos(rake), 0],
  };
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
  stock: { holdRank: 'firing-grip-stock', anchors: stockAnchors },
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
  ...SKS_ANCHORS,
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
