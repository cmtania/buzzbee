// Per-user calibration for the Clap and Buzz missions.
//
// Both missions count by loudness alone: a clap is a short spike above a
// threshold, a buzz is a level held above one. Out of the box those
// thresholds are fixed (-20 dB clap, -25 dB buzz), which is too strict for a
// quiet clapper or a phone on the far side of the bed, and too loose in a
// noisy room. Calibration measures this user's own room and their own clap
// and buzz once, and stores a threshold between the two.
//
// Privacy: only the resulting threshold numbers (dB) are stored. No audio is
// kept — the mic is read exactly as the missions read it, as a live volume
// level (see use-mic-metering.ts), so the "the microphone only reads a volume
// level" promise in the privacy policy and review notes stays true.
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

type Stored = Partial<Record<MicMission, { thresholdDb: number; calibratedAt: string }>>;

async function readStored(): Promise<Stored> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

export async function getThresholds(): Promise<Record<MicMission, number>> {
  const stored = await readStored();
  return {
    clap: stored.clap?.thresholdDb ?? DEFAULT_THRESHOLDS.clap,
    buzz: stored.buzz?.thresholdDb ?? DEFAULT_THRESHOLDS.buzz,
  };
}

export async function isCalibrated(): Promise<Record<MicMission, boolean>> {
  const stored = await readStored();
  return { clap: !!stored.clap, buzz: !!stored.buzz };
}

export async function saveThreshold(mission: MicMission, thresholdDb: number): Promise<void> {
  const stored = await readStored();
  stored[mission] = { thresholdDb, calibratedAt: new Date().toISOString() };
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

/** Thresholds for the missions: defaults immediately, the user's own once loaded. */
export function useMicThresholds(): Record<MicMission, number> {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  useEffect(() => {
    let cancelled = false;
    getThresholds().then((t) => {
      if (!cancelled) setThresholds(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return thresholds;
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
