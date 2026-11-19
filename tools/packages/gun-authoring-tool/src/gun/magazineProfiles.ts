import {
  finite,
  getDotPath,
  type InferOutput,
  integer,
  minValue,
  nonEmpty,
  number,
  pipe,
  record,
  safeParse,
  strictObject,
  string,
} from 'valibot';
import content from '../../../../../models/guns/tables/magazines.json' with { type: 'json' };
import { GUN_PLATFORMS } from './platforms.ts';

const Units = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const Text = pipe(string(), nonEmpty());
const ProfileSchema = strictObject({
  photo: Text,
  scale: Text,
  depthU: Units,
  bodyLengthU: Units,
  widthU: Units,
  capacity: pipe(number(), integer(), minValue(1)),
});
const ContentSchema = strictObject({
  well: strictObject({ heightU: Units, clearanceU: Units }),
  stanag30: strictObject({ depthU: Units, widthU: Units }),
  standards: record(Text, Text),
  profiles: record(Text, ProfileSchema),
});

type MagazineProfileContent = InferOutput<typeof ProfileSchema>;

/** The magazine profiles drawn by code rather than traced into the table. */
const DRAWN_MAGAZINE_PROFILES = ['standard', 'smg', 'pistol', 'ak-curved', 'stanag-curved', 'stanag-straight'] as const;
export type DrawnMagazineProfile = (typeof DRAWN_MAGAZINE_PROFILES)[number];

/** Why the profile-to-standard map names a profile no magazine has, or a standard no magazine mount lists. */
const standardsProblems = (
  { standards, profiles }: InferOutput<typeof ContentSchema>,
  mountStandards: ReadonlySet<string>,
): string[] =>
  Object.entries(standards).flatMap(([profile, standard]) => [
    ...([...DRAWN_MAGAZINE_PROFILES, ...Object.keys(profiles)].includes(profile)
      ? []
      : [`standards.${profile}: no magazine profile is named ${profile}`]),
    ...(mountStandards.has(standard) ? [] : [`standards.${profile}: magazine mounts do not list standard ${standard}`]),
  ]);

/**
 * Checks the authored magazine content against the standards magazine mounts list; a malformed field is a build error
 * naming it.
 */
export const loadMagazineContent = (
  raw: unknown,
  mountStandards: ReadonlySet<string> = new Set(GUN_PLATFORMS.standards.get('magazine')?.keys()),
): InferOutput<typeof ContentSchema> => {
  const parsed = safeParse(ContentSchema, raw);
  const problems = parsed.success
    ? standardsProblems(parsed.output, mountStandards)
    : parsed.issues.map((issue) => `${getDotPath(issue) ?? '(root)'}: ${issue.message}`);
  if (!parsed.success || problems.length > 0) {
    throw new Error(`Magazine content: ${problems.join('; ')}`);
  }
  return parsed.output;
};

const MAGAZINE_CONTENT = loadMagazineContent(content);

/** The well a box magazine seats in: its height over the seat and the clearance round the magazine. */
export const MAGAZINE_WELL = MAGAZINE_CONTENT.well;

/** The 30-round STANAG magazine's body section. */
export const STANAG30_BODY = MAGAZINE_CONTENT.stanag30;

/** The magazine standard a profile is cut for, if it is cut for one. */
export const magazineStandardOf = (profile: string): string | undefined =>
  Object.hasOwn(MAGAZINE_CONTENT.standards, profile) ? MAGAZINE_CONTENT.standards[profile] : undefined;

/** Photo-measured straight box magazines, by profile name. */
export const MAGAZINE_PROFILES = MAGAZINE_CONTENT.profiles;

/** Every magazine profile, drawn or traced. */
export const MAGAZINE_PROFILE_NAMES: readonly string[] = [
  ...DRAWN_MAGAZINE_PROFILES,
  ...Object.keys(MAGAZINE_PROFILES),
];

export const magazineProfileContent = (profile: string | undefined): MagazineProfileContent | undefined =>
  profile !== undefined && Object.hasOwn(MAGAZINE_PROFILES, profile) ? MAGAZINE_PROFILES[profile] : undefined;
