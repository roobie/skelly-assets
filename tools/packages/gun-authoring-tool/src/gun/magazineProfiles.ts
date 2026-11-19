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
  profiles: record(Text, ProfileSchema),
});

type MagazineProfileContent = InferOutput<typeof ProfileSchema>;

/** Checks the authored magazine content; a malformed field is a build error naming it. */
const loadMagazineContent = (raw: unknown): InferOutput<typeof ContentSchema> => {
  const parsed = safeParse(ContentSchema, raw);
  if (!parsed.success) {
    throw new Error(
      `Magazine content: ${parsed.issues.map((issue) => `${getDotPath(issue) ?? '(root)'}: ${issue.message}`).join('; ')}`,
    );
  }
  return parsed.output;
};

const MAGAZINE_CONTENT = loadMagazineContent(content);

/** The well a box magazine seats in: its height over the seat and the clearance round the magazine. */
export const MAGAZINE_WELL = MAGAZINE_CONTENT.well;

/** The 30-round STANAG magazine's body section. */
export const STANAG30_BODY = MAGAZINE_CONTENT.stanag30;

/** Photo-measured straight box magazines, by profile name. */
export const MAGAZINE_PROFILES = MAGAZINE_CONTENT.profiles;

export const magazineProfileContent = (profile: string | undefined): MagazineProfileContent | undefined =>
  profile !== undefined && Object.hasOwn(MAGAZINE_PROFILES, profile) ? MAGAZINE_PROFILES[profile] : undefined;
