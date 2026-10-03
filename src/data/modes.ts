import type { LucideIcon } from 'lucide-react';
import { Shield, Sparkles, Trophy, Users } from 'lucide-react';
import { MATCH_MODES } from '../types';
import type { MatchMode, MatchModeFilter } from '../types';

/** The six creatable modes. "All modes" is intentionally absent. */
export const CREATE_MODES: readonly MatchMode[] = MATCH_MODES;
/** Join/search filter options: "All modes" plus the six real ones. */
export const FILTER_MODES: readonly MatchModeFilter[] = ['All modes', ...MATCH_MODES];

const ICONS: Record<MatchMode, LucideIcon> = {
  '1v1 Dream Team': Sparkles,
  '1v1 Authentic Team': Shield,
  'Co-op Friendly 2V2': Users,
  'Co-op Friendly 3V3': Users,
  'Tournament (4)': Trophy,
  'Tournament (8)': Trophy,
};
export const iconForMode = (mode: MatchMode): LucideIcon => ICONS[mode];