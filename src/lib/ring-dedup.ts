// Shared "already rang today" tracking, used by both useSmartWakeMonitor's
// interval (lib/smart-wake-engine.ts's consumer) and the AlarmKit-launch
// handler in _layout.tsx. Keyed by the alarm's actual deadline time-of-day,
// not just its id + date — otherwise editing an alarm's time to retest it
// (or any other same-day time change) would stay silently blocked for the
// rest of the day. A module-level Set rather than a useRef because it needs
// to be visible across two independent effects that don't otherwise share
// state (see the doc comment on the AlarmKit-launch effect in _layout.tsx —
// without this, AlarmKit launching the app straight into a mission doesn't
// stop the JS monitor's next tick from independently noticing the same
// overdue deadline and pushing a second, duplicate /ringing screen).
const triggeredToday = new Set<string>();

export function dedupKey(alarmId: string, windowEnd: string, from: Date = new Date()): string {
  const todayKey = from.toISOString().slice(0, 10);
  return `${alarmId}:${todayKey}:${windowEnd}`;
}

export function hasTriggeredToday(key: string): boolean {
  return triggeredToday.has(key);
}

export function markTriggeredToday(key: string): void {
  triggeredToday.add(key);
}
