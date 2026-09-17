import { StyleSheet, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { Colors } from '@/constants/theme';

export function Toggle({
  value,
  onChange,
  size = 'md',
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  size?: 'md' | 'lg';
}) {
  const width = size === 'lg' ? 48 : 44;
  const height = size === 'lg' ? 28 : 26;
  const knob = size === 'lg' ? 22 : 20;
  const travel = width - knob - 6;

  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[
        styles.track,
        {
          width,
          height,
          backgroundColor: value ? Colors.accent : Colors.trackOff,
        },
      ]}
      // md height is 26pt; +8 hitSlop only reached ~42pt, just under Apple's
      // 44pt minimum tap target. Extra vertical slop closes that gap without
      // changing the track's actual visual size.
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
      <View
        style={[
          styles.knob,
          {
            width: knob,
            height: knob,
            transform: [{ translateX: value ? travel : 0 }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 100,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    borderRadius: 100,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
