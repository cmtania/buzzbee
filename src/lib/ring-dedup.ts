// Shared "already rang today" tracking, used by both useSmartWakeMonitor's
// interval (lib/smart-wake-engine.ts's consumer) and the AlarmKit-launch
// handler in _layout.tsx. Keyed by id + date only (NOT the alarm's
// windowEnd) — an earlier version also keyed on windowEnd so that editing an
// alarm's time to retest it wouldn't stay silently blocked for the rest of
// the day, but that meant any same-day edit-and-save of a real alarm (e.g.
// opening it from Home right after dismissing it, for any reason) reset this
// protection and could ring it again later that same day for real users.
// That dev-testing convenience isn't needed anymore now that Test Smart Wake
// (test-smart-wake.tsx's simulate mode) exists as the real way to retest —
// so this stays stable across same-day edits instead. A module-level Set
// rather than a useRef because it needs to be visible across two independent
// effects that don't otherwise share state (see the doc comment on the
// AlarmKit-launch effect in _layout.tsx — without this, AlarmKit launching
// the app straight into a mission doesn't stop the JS monitor's next tick
// from independently noticing the same overdue deadline and pushing a
// second, duplicate /ringing screen).
const triggeredToday = new Set<string>();

export function dedupKey(alarmId: string, from: Date = new Date()): string {
  const todayKey = from.toISOString().slice(0, 10);
  return `${alarmId}:${todayKey}`;
}

export function hasTriggeredToday(key: string): boolean {
  return triggeredToday.has(key);
}

export function markTriggeredToday(key: string): void {
  triggeredToday.add(key);
}
