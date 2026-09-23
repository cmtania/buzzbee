import React from 'react';
import { View } from 'react-native';

import {
  DismissMethod,
  MISSION_COUNT_LABELS,
  MISSION_DESCRIPTIONS,
  MISSION_LABELS,
  MISSION_SUBTITLES,
} from '@/lib/types';
import { Dices, Divide, Hand, Minus, Plus, Target, Vibrate, Volume2, X as MultiplyIcon } from 'lucide-react-native';

export const MISSION_ORDER: DismissMethod[] = ['math', 'clap', 'shake', 'buzz', 'tap', 'random'];

// No single lucide icon covers "math" the way Sigma/Calculator only gesture
// at it — a 2x2 grid of the four basic operators reads unambiguously as
// "math" at a glance, built from the same lucide primitives as every other
// mission icon rather than a one-off custom SVG.
function MathOperatorsIcon({ size = 24, color }: { size?: number; color?: string }) {
  const opSize = size * 0.42;
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: size * 0.08,
        rowGap: size * 0.08,
      }}>
      <Plus size={opSize} color={color} strokeWidth={2.75} />
      <MultiplyIcon size={opSize} color={color} strokeWidth={2.75} />
      <Minus size={opSize} color={color} strokeWidth={2.75} />
      <Divide size={opSize} color={color} strokeWidth={2.75} />
    </View>
  );
}

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
      return <MathOperatorsIcon size={size} color={color} />;
    case 'clap':
      return <Hand size={size} color={color} />;
    case 'shake':
      return <Vibrate size={size} color={color} />;
    case 'buzz':
      return <Volume2 size={size} color={color} />;
    case 'tap':
      // Concentric rings around a center point — a tap's ripple, built from
      // the same "circle inside a circle inside a circle" shape as a
      // bullseye.
      return <Target size={size} color={color} />;
    case 'random':
      return <Dices size={size} color={color} />;
  }
}

export function missionLabel(method: DismissMethod) {
  return MISSION_LABELS[method];
}

export function missionSubtitle(method: DismissMethod) {
  return MISSION_SUBTITLES[method];
}

export function missionDescription(method: DismissMethod) {
  return MISSION_DESCRIPTIONS[method];
}

export function missionCountLabel(method: DismissMethod) {
  return MISSION_COUNT_LABELS[method];
}
