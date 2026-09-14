import { Alarm } from './types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export function dayShortLabel(dow: number): string {
  return DAY_LABELS[dow];
}

export function repeatSummary(repeatDays: number[]): string {
  if (repeatDays.length === 0) return 'Once';
  const sorted = [...repeatDays].sort();
  const isSet = (set: number[]) =>
    sorted.length === set.length && set.every((d) => sorted.includes(d));
  if (isSet(EVERY_DAY)) return 'Every day';
  if (isSet(WEEKDAYS)) return 'Weekdays';
  if (isSet(WEEKENDS)) return 'Weekends';
  return sorted.map(dayShortLabel).join(' ');
}

export function formatClock(time: string): { value: string; ampm: string } {
  const [hh, mm] = time.split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return { value: `${hour12}:${String(mm).padStart(2, '0')}`, ampm };
}

/** "HH:MM" -> "6:30 AM" — for plain-text copy (notification bodies, etc.) that can't use formatClock's split value/ampm. */
export function formatTime12h(time: string): string {
  const { value, ampm } = formatClock(time);
  return `${value} ${ampm}`;
}

/** Next Date this time-of-day + repeatDays pattern will occur, strictly after `from`. */
export function nextOccurrence(time: string, repeatDays: number[], from: Date = new Date()): Date {
  const [hh, mm] = time.split(':').map(Number);
  const candidateFor = (dayOffset: number) => {
    const d = new Date(from);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hh, mm, 0, 0);
    return d;
  };
  if (repeatDays.length === 0) {
    const today = candidateFor(0);
    return today > from ? today : candidateFor(1);
  }
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = candidateFor(offset);
    if (repeatDays.includes(candidate.getDay()) && candidate > from) return candidate;
  }
  return candidateFor(7);
}

/** 23:59:59.999 on the same day as `date` — used to push a "next occurrence" search past today. */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Whether an ISO timestamp's local hour:minute matches a "HH:MM" time string. */
export function isoMatchesTime(iso: string, time: string): boolean {
  const [hh, mm] = time.split(':').map(Number);
  const d = new Date(iso);
  return d.getHours() === hh && d.getMinutes() === mm;
}

export function countdownTo(target: Date, from: Date) {
  const diffMs = target.getTime() - from.getTime();
  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  // Progress within a 24h lookback window, just for the dial's visual fill.
  const dayMs = 24 * 60 * 60 * 1000;
  const progress = 1 - Math.min(1, diffMs / dayMs);
  return { label, progress, next: target };
}

/** For Smart-Wake alarms: countdown to when the wake window opens. */
export function countdownToWindowStart(alarm: Alarm, from: Date = new Date()) {
  return countdownTo(nextOccurrence(alarm.windowStart, alarm.repeatDays, from), from);
}

/** For fixed-time alarms (Smart Wake off): countdown to when it actually rings. */
export function countdownToRingTime(alarm: Alarm, from: Date = new Date()) {
  return countdownTo(nextOccurrence(alarm.windowEnd, alarm.repeatDays, from), from);
}
