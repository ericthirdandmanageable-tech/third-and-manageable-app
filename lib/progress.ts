import { SportConfig } from "@/types";

const JOURNEY_DAYS = 90;

export interface ProgressInfo {
  /** Current period (1-based, clamped to totalPeriods) */
  currentPeriod: number;
  /** Total periods for this sport */
  totalPeriods: number;
  /** Days elapsed since joined */
  daysElapsed: number;
  /** Days remaining in the full journey */
  daysRemaining: number;
  /** Days per period for this sport */
  daysPerPeriod: number;
  /** Days into the current period */
  daysIntoPeriod: number;
  /** Days remaining in the current period */
  daysLeftInPeriod: number;
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  /** Current period progress percentage (0-100) */
  periodProgress: number;
  /** Whether the user just crossed into a new period (within last 24h) */
  justAdvanced: boolean;
  /** Whether the full journey is complete */
  journeyComplete: boolean;
}

/**
 * Compute progress info from joined_at date and sport config.
 * The 90-day journey is divided into equal segments based on sport periods.
 */
export function computeProgress(
  joinedAt: string,
  sport: SportConfig,
): ProgressInfo {
  const joinDate = new Date(joinedAt);
  const now = new Date();
  const diffMs = now.getTime() - joinDate.getTime();
  const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const totalPeriods = sport.totalPeriods;
  const daysPerPeriod = JOURNEY_DAYS / totalPeriods;

  // Which period are we in? (0-indexed internally, 1-indexed for display)
  const rawPeriod = Math.floor(daysElapsed / daysPerPeriod);
  const currentPeriod = Math.min(rawPeriod + 1, totalPeriods);
  const journeyComplete = daysElapsed >= JOURNEY_DAYS;

  // Days into current period
  const daysIntoPeriod = journeyComplete
    ? daysPerPeriod
    : daysElapsed - rawPeriod * daysPerPeriod;
  const daysLeftInPeriod = journeyComplete
    ? 0
    : Math.ceil(daysPerPeriod - daysIntoPeriod);

  // Progress percentages
  const overallProgress = Math.min(100, (daysElapsed / JOURNEY_DAYS) * 100);
  const periodProgress = Math.min(100, (daysIntoPeriod / daysPerPeriod) * 100);

  // Did we just advance? (crossed boundary within last day)
  const yesterdayPeriod = Math.floor(Math.max(0, daysElapsed - 1) / daysPerPeriod) + 1;
  const justAdvanced =
    daysElapsed > 0 && currentPeriod > yesterdayPeriod && !journeyComplete;

  return {
    currentPeriod,
    totalPeriods,
    daysElapsed,
    daysRemaining: Math.max(0, JOURNEY_DAYS - daysElapsed),
    daysPerPeriod: Math.round(daysPerPeriod),
    daysIntoPeriod: Math.round(daysIntoPeriod),
    daysLeftInPeriod,
    overallProgress: Math.round(overallProgress),
    periodProgress: Math.round(periodProgress),
    justAdvanced,
    journeyComplete,
  };
}

/**
 * Get an encouragement message based on overall progress.
 */
export function getProgressMessage(info: ProgressInfo, periodName: string): string {
  if (info.journeyComplete) {
    return `You completed all ${info.totalPeriods} ${periodName.toLowerCase()}s. Time to celebrate this chapter.`;
  }
  const pct = info.overallProgress;
  if (pct < 15) return "You're just getting started. Every day counts.";
  if (pct < 30) return "Building a foundation. Keep showing up.";
  if (pct < 50) return "Building momentum. You're finding your rhythm.";
  if (pct < 70) return "Past the halfway mark. You're proving it to yourself.";
  if (pct < 85) return "The home stretch is in sight. Stay the course.";
  return "Almost there. Finish strong — you've earned it.";
}

/**
 * Get a milestone celebration message when advancing to a new period.
 */
export function getMilestoneMessage(
  period: number,
  totalPeriods: number,
  periodName: string,
): string {
  if (period >= totalPeriods) {
    return `You've completed your final ${periodName.toLowerCase()}! Your 90-day journey is complete. Take a moment to reflect on how far you've come.`;
  }
  if (period === 2) {
    return `You've made it to ${periodName} ${period}! The hardest part — starting — is behind you. Keep building.`;
  }
  if (period === Math.ceil(totalPeriods / 2) + 1) {
    return `Halfway through your journey! ${periodName} ${period} begins. You're showing real commitment.`;
  }
  return `${periodName} ${period} begins! You've proven you can stick with it. Keep pushing forward.`;
}
