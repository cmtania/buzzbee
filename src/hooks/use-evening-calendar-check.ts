import { useEffect } from 'react';

import { runEveningCalendarCheck } from '@/lib/calendar-shift';

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Foreground-only evening calendar check (see PLAN.md's Known Technical Risk
 * section — there is no true background task wiring yet). Runs once on
 * mount and then every 30 minutes; `runEveningCalendarCheck` itself no-ops
 * outside the evening window and dedupes per calendar day.
 */
export function useEveningCalendarCheck() {
  useEffect(() => {
    runEveningCalendarCheck();
    const interval = setInterval(() => runEveningCalendarCheck(), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
