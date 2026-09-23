import React, { createContext, useContext, useMemo, useState } from 'react';

import { getSettingsCache } from './settings-cache';
import { Alarm, newAlarmDraft } from './types';

type AlarmDraftContextValue = {
  draft: Alarm;
  setDraft: React.Dispatch<React.SetStateAction<Alarm>>;
  startDraft: (initial?: Alarm) => void;
};

const AlarmDraftContext = createContext<AlarmDraftContextValue | null>(null);

// A fresh draft (no `initial`, i.e. tapping "+" for a new alarm) uses the
// user's chosen default sound (Settings → Sound & Haptics) rather than
// newAlarmDraft()'s hardcoded fallback — via the sync settings cache, same
// reasoning as HapticPressable's use of it.
function freshDraft(): Alarm {
  const draft = newAlarmDraft();
  const defaultSound = getSettingsCache()?.defaultSound;
  return defaultSound ? { ...draft, sound: defaultSound } : draft;
}

export function AlarmDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Alarm>(freshDraft());

  const value = useMemo<AlarmDraftContextValue>(
    () => ({
      draft,
      setDraft,
      startDraft: (initial) => {
        setDraft(initial ?? freshDraft());
      },
    }),
    [draft]
  );

  return <AlarmDraftContext.Provider value={value}>{children}</AlarmDraftContext.Provider>;
}

export function useAlarmDraft() {
  const ctx = useContext(AlarmDraftContext);
  if (!ctx) throw new Error('useAlarmDraft must be used within AlarmDraftProvider');
  return ctx;
}
