// Per-user calibration for the Clap and Buzz missions.
//
// Both missions count by loudness alone: a clap is a short spike above a
// threshold, a buzz is a level held above one. Out of the box those
// thresholds are fixed (-20 dB clap, -25 dB buzz), which is too strict for a
// quiet clapper or a phone on the far side of the bed, and too loose in a
// noisy room. Calibration measures this user's own room and their own clap
// and buzz once, and stores a threshold between the two.
//
// Since 1.0.2 it also saves a sound fingerprint of the user's own clap or
// buzz (16 numbers, see lib/sound-print.ts), so the missions can ignore loud
// sounds that aren't a clap or a buzz.
//
// Privacy: only numbers are stored — a loudness threshold, the 16-number
// fingerprint and a match tolerance per mission. Audio is analysed in memory
// and discarded; nothing is recorded or uploaded.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type MicMission = 'clap' | 'buzz';

export const DEFAULT_THRESHOLDS: Record<MicMission, number> = { clap: -20, buzz: -25 };

// Never below this, or ordinary room noise could count; never above this, or
// even a real clap might miss.
const MIN_THRESHOLD_DB = -45;
const MAX_THRESHOLD_DB = -5;
// Metering reads ~-160 dB in true silence; treat anything quieter as this.
const FLOOR_DB = -70;

const STORAGE_KEY = 'mic-calibration';

type Entry = { thresholdDb: number; calibratedAt: string; print?: number[]; tolerance?: number };
type Stored = Partial<Record<MicMission, Entry>>;

/** What a mission listens for. `print` is null when uncalibrated (or calibrated
 * before 1.0.2): the mission then matches on loudness alone. */
export type MicProfile = { thresholdDb: number; print: number[] | null; tolerance: number };

async function readStored(): Promise<Stored> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

export async function isCalibrated(): Promise<Record<MicMission, boolean>> {
  const stored = await readStored();
  return { clap: !!stored.clap, buzz: !!stored.buzz };
}

export async function saveCalibration(
  mission: MicMission,
  thresholdDb: number,
  print: number[] | null,
  tolerance: number
): Promise<void> {
  const stored = await readStored();
  stored[mission] = {
    thresholdDb,
    calibratedAt: new Date().toISOString(),
    ...(print ? { print, tolerance } : {}),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored)).catch(() => {});
}

export async function resetCalibration(mission?: MicMission): Promise<void> {
  if (!mission) {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    return;
  }
  const stored = await readStored();
  delete stored[mission];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored)).catch(() => {});
}

async function getProfile(mission: MicMission): Promise<MicProfile> {
  const e = (await readStored())[mission];
  return {
    thresholdDb: e?.thresholdDb ?? DEFAULT_THRESHOLDS[mission],
    print: e?.print ?? null,
    tolerance: e?.tolerance ?? 0.7,
  };
}

/** A mission's profile: loudness defaults immediately, the user's own once loaded. */
export function useMicProfile(mission: MicMission): MicProfile {
  const [profile, setProfile] = useState<MicProfile>({
    thresholdDb: DEFAULT_THRESHOLDS[mission],
    print: null,
    tolerance: 0.7,
  });
  useEffect(() => {
    let cancelled = false;
    getProfile(mission).then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [mission]);
  return profile;
}

// ---- measurement maths (pure, so they're easy to reason about) -------------

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const clamp = (v: number) => Math.min(MAX_THRESHOLD_DB, Math.max(MIN_THRESHOLD_DB, v));

/** The room's resting level, from samples taken while the user stays quiet. */
export function roomLevel(quietSamples: number[]): number {
  if (!quietSamples.length) return FLOOR_DB;
  return Math.max(FLOOR_DB, median(quietSamples));
}

/** A clap/buzz has to rise at least this far above the room to be measured. */
export const CLAP_RISE_DB = 12;
export const BUZZ_RISE_DB = 8;

/**
 * Clap threshold from the peak loudness of each calibration clap. Set 60% of
 * the way from the room to the *weakest* clap, so every clap like the ones
 * just made still counts, while staying clear of the room's own noise.
 */
export function clapThreshold(room: number, clapPeaks: number[]): number {
  const weakest = Math.min(...clapPeaks);
  return clamp(Math.max(room + 8, room + 0.6 * (weakest - room)));
}

/** Buzz threshold from the samples taken while the user held a buzz. */
export function buzzThreshold(room: number, buzzSamples: number[]): number {
  const level = median(buzzSamples);
  return clamp(Math.max(room + 6, room + 0.6 * (level - room)));
}
