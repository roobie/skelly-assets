import type { SurfaceEdit, SurfacePass } from '@skelly/surfaces/patch';

/** A shader that failed to compile: its stage, the driver's log and the source it was given. */
export interface FailedShader {
  readonly stage: SurfaceEdit['stage'];
  readonly log: string;
  readonly source: string;
}

/** One error of the log, placed in the surface edit it falls in when it falls in one. */
export interface ShaderError {
  readonly stage: SurfaceEdit['stage'];
  readonly message: string;
  /** The line in the whole source, and its text. */
  readonly line: number;
  readonly text: string;
  /** The kind whose edits the program holds, and where the line falls among them. */
  readonly kind?: string;
  readonly pass?: SurfacePass;
  readonly anchor?: string;
  /** The line within the edit, from 1. */
  readonly editLine?: number;
}

type Edits = Readonly<Record<string, Partial<Record<SurfacePass, readonly SurfaceEdit[]>>>>;

const ERROR_LINE = /^ERROR:\s*\d+:(\d+):\s*(.*)$/;

interface Placed {
  readonly kind: string;
  readonly pass: SurfacePass;
  readonly anchor: string;
  /** The edit's first and last line in the source, from 1. */
  readonly first: number;
  readonly last: number;
}

const lineOf = (source: string, index: number) => source.slice(0, index).split('\n').length;

// Where each edit of the stage sits in the source. An edit's code is inserted verbatim, so finding it is exact.
const placed = (shader: FailedShader, edits: Edits): Placed[] =>
  Object.entries(edits).flatMap(([kind, passes]) =>
    Object.entries(passes).flatMap(([pass, list]) =>
      (list ?? [])
        .filter((edit) => edit.stage === shader.stage)
        .flatMap(({ anchor, code }) => {
          const at = shader.source.indexOf(code);
          if (at < 0 || code.trim() === '') return [];
          const first = lineOf(shader.source, at);
          return [{ kind, pass: pass as SurfacePass, anchor, first, last: first + code.split('\n').length - 1 }];
        }),
    ),
  );

/**
 * The errors of a failed shader, each named by the kind, pass and anchor of the surface edit holding its line, so an
 * author sees which kind broke and where in its code. A line outside every edit names the kind the program holds.
 */
export const shaderErrors = (shader: FailedShader, edits: Edits): ShaderError[] => {
  const spots = placed(shader, edits);
  const lines = shader.source.split('\n');
  const errors = shader.log
    .split('\n')
    .map((entry) => ERROR_LINE.exec(entry.trim()))
    .filter((match) => match !== null)
    .map(([, at, message]): ShaderError => {
      const line = Number(at);
      const base = { stage: shader.stage, message: message ?? '', line, text: lines[line - 1]?.trim() ?? '' };
      const spot = spots.find(({ first, last }) => line >= first && line <= last);
      if (spot !== undefined)
        return { ...base, kind: spot.kind, pass: spot.pass, anchor: spot.anchor, editLine: line - spot.first + 1 };
      const holder = spots[0];
      return holder === undefined ? base : { ...base, kind: holder.kind, pass: holder.pass };
    });
  return errors.length > 0 ? errors : [{ stage: shader.stage, message: shader.log.trim(), line: 0, text: '' }];
};

/** An error as one line of the page's error panel. */
export const describe = ({ stage, message, line, text, kind, pass, anchor, editLine }: ShaderError) => {
  const where =
    anchor !== undefined
      ? `${kind} ${pass} edit after ${anchor}, line ${editLine}`
      : kind !== undefined
        ? `${kind} ${pass} program, ${stage} line ${line}`
        : `${stage} line ${line}`;
  return `${where}: ${message}${text === '' ? '' : `\n  ${text}`}`;
};
