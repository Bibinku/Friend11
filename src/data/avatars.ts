/**
 * The 20 approved FRIEND11 avatars (optimised 320px copies of the original
 * artwork). Labels are playing archetypes only — never real player names.
 */
const urls = import.meta.glob('../assets/avatars/avatar-*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const LABELS = [
  'Goal Poacher',
  'Fox in the Box',
  'Deep Lying Forward',
  'Prolific Winger',
  'Roaming Flank',
  'Cross Specialist',
  'Hole Player',
  'Creative Playmaker',
  'Classic No.10',
  'Orchestrator',
  'Box to Box',
  'Anchor Man',
  'The Destroyer',
  'Build Up',
  'Defensive Full-back',
  'Offensive Full-back',
  'Attacking GK',
  'Defensive GK',
  'Hole Player',
  'Fox in the Box',
] as const;

export interface Avatar {
  id: number;
  label: string;
  src: string;
}

export const AVATARS: readonly Avatar[] = LABELS.map((label, i) => {
  const id = i + 1;
  const file = `../assets/avatars/avatar-${String(id).padStart(2, '0')}.jpg`;
  return { id, label, src: urls[file] ?? '' };
});

export const DEFAULT_AVATAR_ID = 1;

/** Safe lookup: corrupted / out-of-range ids fall back to the default. */
export function avatarFor(id: number | null | undefined): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[DEFAULT_AVATAR_ID - 1];
}
