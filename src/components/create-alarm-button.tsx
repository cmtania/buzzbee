import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AlarmClockPlus } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassCard } from '@/components/glass-card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Shadows } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';

const BTN_SIZE = 64;
const EDGE_MARGIN = 16;
// How far the finger must travel before the pan gesture takes over from the
// tap gesture (see the Gesture.Race() below) — has to be small enough that
// a real drag doesn't feel sticky, but big enough that Tap reliably wins a
// plain tap's few pixels of incidental finger movement.
const PAN_ACTIVATION_DISTANCE = 10;
const STORAGE_KEY = 'create-alarm-button-position';

function clamp(n: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, n));
}

/**
 * Floating "+" — draggable anywhere on screen and snaps to the nearest
 * horizontal edge on release, the same interaction as Apple's AssistiveTouch
 * bubble. This sidesteps the whole "where exactly does the native tab bar
 * sit" problem the earlier fixed-position version had: since the person can
 * just drag it wherever reads best for them, there's no native-chrome
 * height to guess at all.
 *
 * Built on react-native-gesture-handler + react-native-reanimated (already
 * installed, already used elsewhere for wind-down.tsx's breathing
 * animation) rather than the legacy Animated + PanResponder combo — that
 * combo's `Animated.event(..., { useNativeDriver: true })` doesn't come
 * back as a callable function under this app's New Architecture/Fabric
 * setup (confirmed on-device: "TypeError: Object is not a function" the
 * instant a drag starts), a known friction point between those older APIs
 * and Fabric. Gesture.Pan()/Reanimated is the current standard way to build
 * this exact interaction on Fabric.
 *
 * Rendered once from the root _layout.tsx (as a sibling of the whole Stack,
 * shown only on the three tab routes) rather than from each tab screen —
 * NativeTabs sizes a tab screen's own content frame to stop above the
 * native tab bar, so an overlay positioned *inside* one of those screens
 * can never reach into the tab bar's row at all; rendered here it's
 * positioned against the true screen bounds instead.
 *
 * Position persists across launches via AsyncStorage, same as AssistiveTouch
 * remembering where you left it.
 */
export function CreateAlarmButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startDraft } = useAlarmDraft();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const minX = EDGE_MARGIN;
  const maxX = screenWidth - BTN_SIZE - EDGE_MARGIN;
  const minY = insets.top + EDGE_MARGIN;
  const maxY = screenHeight - insets.bottom - BTN_SIZE - EDGE_MARGIN;

  const translateX = useSharedValue(maxX);
  const translateY = useSharedValue(maxY - 90);
  // Snapshot of translateX/Y at gesture start — onUpdate adds the running
  // translation on top of this rather than the live value, since reading
  // translateX.value inside onUpdate while also writing it there each frame
  // would compound instead of tracking the finger.
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        translateX.value = clamp(saved.x, minX, maxX);
        translateY.value = clamp(saved.y, minY, maxY);
      })
      .catch(() => {});
    // Runs once on mount — re-clamping against a later window-size change
    // (e.g. rotation) isn't handled, matching this app's portrait-only use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    startDraft();
    router.push('/add-edit');
  }

  function persist(x: number, y: number) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y })).catch(() => {});
  }

  // Gesture.Pan() has its own activation distance before it ever begins —
  // a plain tap with near-zero movement may never fire onStart/onUpdate/
  // onEnd on the pan at all, so a threshold check *inside* pan's onEnd
  // (an earlier version of this file did that) never gets a chance to run
  // for a real tap; nothing calls openCreate. Gesture.Tap() is a separate
  // recognizer built for exactly the tap case, and Gesture.Race() lets both
  // listen to the same touch simultaneously — whichever activates first
  // wins and cancels the other. This is the standard gesture-handler
  // pattern for "draggable but also tappable".
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(openCreate)();
  });

  const pan = Gesture.Pan()
    .minDistance(PAN_ACTIVATION_DISTANCE)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      // Mutating a Reanimated shared value's `.value` is the documented,
      // intended API (a plain mutable UI-thread cell, not React state) —
      // react-hooks/immutability doesn't yet recognize that pattern and
      // flags it as if it were an illegal state mutation.
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = startX.value + e.translationX;
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = startY.value + e.translationY;
    })
    .onEnd((e) => {
      // Pan only ever activates here once movement has already passed
      // minDistance, so every call is a genuine drag — no tap fallback
      // needed (Gesture.Tap() above owns that case entirely).
      const rawX = startX.value + e.translationX;
      const rawY = startY.value + e.translationY;
      const snappedX = rawX + BTN_SIZE / 2 < screenWidth / 2 ? minX : maxX;
      const clampedY = clamp(rawY, minY, maxY);
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = withSpring(snappedX);
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = withSpring(clampedY);
      runOnJS(persist)(snappedX, clampedY);
    });

  const composedGesture = Gesture.Race(tap, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.wrap, animatedStyle]}>
        <GlassCard style={styles.addBtn} shadow={Shadows.floating} isInteractive>
          <AlarmClockPlus size={30} color={Colors.accentDeep} strokeWidth={2.2} />
        </GlassCard>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BTN_SIZE,
    height: BTN_SIZE,
  },
  addBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
