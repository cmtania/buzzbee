import React from 'react';

import {
  BuzzIcon,
  ClapIcon,
  MathIcon,
  RandomIcon,
  ShakeIcon,
  TapIcon,
} from '@/components/icons';
import { DismissMethod, MISSION_LABELS, MISSION_SUBTITLES } from '@/lib/types';

export const MISSION_ORDER: DismissMethod[] = ['math', 'clap', 'shake', 'buzz', 'tap', 'random'];

export function MissionIcon({
  method,
  size,
  color,
}: {
  method: DismissMethod;
  size?: number;
  color?: string;
}) {
  switch (method) {
    case 'math':
      return <MathIcon size={size} color={color} />;
    case 'clap':
      return <ClapIcon size={size} color={color} />;
    case 'shake':
      return <ShakeIcon size={size} color={color} />;
    case 'buzz':
      return <BuzzIcon size={size} color={color} />;
    case 'tap':
      return <TapIcon size={size} color={color} />;
    case 'random':
      return <RandomIcon size={size} color={color} />;
  }
}

export function missionLabel(method: DismissMethod) {
  return MISSION_LABELS[method];
}

export function missionSubtitle(method: DismissMethod) {
  return MISSION_SUBTITLES[method];
}
