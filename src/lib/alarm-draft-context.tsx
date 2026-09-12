import React, { createContext, useContext, useMemo, useState } from 'react';

import { Alarm, newAlarmDraft } from './types';

type AlarmDraftContextValue = {
  draft: Alarm;
  setDraft: React.Dispatch<React.SetStateAction<Alarm>>;
  startDraft: (initial?: Alarm) => void;
};

const AlarmDraftContext = createContext<AlarmDraftContextValue | null>(null);

export function AlarmDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Alarm>(newAlarmDraft());

  const value = useMemo<AlarmDraftContextValue>(
    () => ({
      draft,
      setDraft,
      startDraft: (initial) => setDraft(initial ?? newAlarmDraft()),
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
