import * as Haptics from 'expo-haptics';
import { ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Fonts, Radii } from '@/constants/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PADDING_COUNT = Math.floor(VISIBLE_ITEMS / 2);
// How many copies of the item list are laid end-to-end so the wheel can
// scroll continuously in either direction. Recentering (see commit()) keeps
// the current position near the middle copy well before either end is ever
// reached, so this just needs to comfortably outlast any single scroll
// gesture — no realistic flick crosses anywhere near 100 loops.
const LOOP_COUNT = 101;
const EDGE_MARGIN_LOOPS = 10;

// Animated.FlatList's generic prop typing tries to wrap every prop (`data`
// included) in WithAnimatedValue<T>, which doesn't unify with a generic item
// type like WheelItem<T> — a known typing friction with Animated-wrapped
// generic lists, not a real type hazard here (nothing but scroll offset is
// actually animated). Untyped alias for just the JSX element; the ref below
// stays properly typed against plain FlatList for everything this file
// actually calls on it (scrollToOffset).
const AnimatedFlatList = Animated.FlatList as unknown as ComponentType<any>;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export type WheelItem<T> = { label: string; value: T };

/**
 * A plain JS scroll wheel (FlatList + snap), replacing
 * @react-native-picker/picker entirely — that native wheel wraps iOS's
 * UIPickerView, which crashed on-device (confirmed via a real crash log:
 * EXC_BAD_ACCESS inside UIPickerView/UITableView cell recycling, hit while
 * touching the wheel mid-scroll, routed through RCTViewComponentView's
 * Fabric hitTest). That's a memory-safety bug inside UIKit itself, not
 * something catchable from JS, so the only real fix is not using the native
 * component at all. See time-picker-modal.tsx, which this replaces.
 *
 * Loops continuously in both directions (scroll past the last minute and it
 * keeps going straight into the first, and vice versa) by rendering
 * `items` repeated LOOP_COUNT times and silently re-centering back to the
 * middle copy once the settled position drifts near either end — the jump
 * is an exact multiple of `items.length` away, so the visible content is
 * identical and the teleport is imperceptible.
 */
export function WheelPicker<T extends string | number>({
  items,
  value,
  onChange,
  loop = true,
}: {
  items: WheelItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Continuous scroll in both directions (see the doc comment below).
   * Default on; turned off for a 2-item wheel like AM/PM, where looping
   * through just two values reads as broken rather than a real wheel. */
  loop?: boolean;
}) {
  const listRef = useRef<FlatList<number>>(null);
  const count = items.length;
  const loopCount = loop ? LOOP_COUNT : 1;
  const middleLoopStart = Math.floor(loopCount / 2) * count;
  const virtualIndices = useMemo(
    () => Array.from({ length: loopCount * count }, (_, i) => i),
    [count, loopCount]
  );

  function realIndexOf(virtualIndex: number): number {
    return ((virtualIndex % count) + count) % count;
  }

  const initialRealIndex = Math.max(
    0,
    items.findIndex((it) => it.value === value)
  );
  const initialVirtualIndex = middleLoopStart + initialRealIndex;

  // useState's lazy initializer (not useRef().current) creates this once and
  // keeps it stable across renders without reading a ref's value during
  // render, which the newer react-hooks/refs lint rule flags outright.
  const [scrollY] = useState(() => new Animated.Value(initialVirtualIndex * ITEM_HEIGHT));
  const lastCommitted = useRef(value);
  const lastVirtualIndex = useRef(initialVirtualIndex);

  // Re-sync when `value` changes from outside this wheel's own scrolling —
  // e.g. the modal reopening with a different initial time, or a sibling
  // wheel's change clamping this one. A change this wheel itself just
  // committed is skipped so it doesn't fight the user's own scroll or
  // double-animate after every tick.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      const real = Math.max(
        0,
        items.findIndex((it) => it.value === value)
      );
      const virtualIdx = middleLoopStart + real;
      lastVirtualIndex.current = virtualIdx;
      listRef.current?.scrollToOffset({ offset: virtualIdx * ITEM_HEIGHT, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(offsetY: number) {
    const virtualIdx = clamp(Math.round(offsetY / ITEM_HEIGHT), 0, virtualIndices.length - 1);
    const real = realIndexOf(virtualIdx);
    const item = items[real];
    if (item.value !== value) {
      Haptics.selectionAsync().catch(() => {});
      onChange(item.value);
    }
    lastCommitted.current = item.value;

    const loopIndex = Math.floor(virtualIdx / count);
    const nearEdge = loop && (loopIndex < EDGE_MARGIN_LOOPS || loopIndex > loopCount - EDGE_MARGIN_LOOPS);
    const targetVirtualIdx = nearEdge ? middleLoopStart + real : virtualIdx;
    lastVirtualIndex.current = targetVirtualIdx;
    // snapToInterval already lands close to exact, but re-issue precisely in
    // case of float drift so the wheel never rests half a row off. Recentering
    // jumps (nearEdge) skip the animation since it's an invisible teleport —
    // an animated scroll across dozens of loops would otherwise flash by.
    listRef.current?.scrollToOffset({ offset: targetVirtualIdx * ITEM_HEIGHT, animated: !nearEdge });
  }

  // Only drives the opacity/scale interpolation below — no per-tick haptic
  // listener here (that would mean reading a ref inside a function built
  // during render, which the react-hooks/refs lint rule flags outright even
  // though it's only ever invoked later, async, as a scroll callback).
  // commit() below gives one haptic when the wheel actually settles on a new
  // value instead.
  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.highlight} />
      <AnimatedFlatList
        ref={listRef}
        data={virtualIndices}
        keyExtractor={(virtualIdx: number) => String(virtualIdx)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PADDING_COUNT }}
        initialScrollIndex={initialVirtualIndex}
        getItemLayout={(_: unknown, i: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => commit(e.nativeEvent.contentOffset.y)}
        renderItem={({ item: virtualIdx }: { item: number }) => {
          const label = items[realIndexOf(virtualIdx)].label;
          const inputRange = [
            (virtualIdx - 2) * ITEM_HEIGHT,
            (virtualIdx - 1) * ITEM_HEIGHT,
            virtualIdx * ITEM_HEIGHT,
            (virtualIdx + 1) * ITEM_HEIGHT,
            (virtualIdx + 2) * ITEM_HEIGHT,
          ];
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.25, 0.55, 1, 0.55, 0.25],
            extrapolate: 'clamp',
          });
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.82, 0.9, 1, 0.9, 0.82],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View style={[styles.item, { opacity, transform: [{ scale }] }]}>
              <Text style={styles.itemText}>{label}</Text>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * PADDING_COUNT,
    // Inset 10% on each side so each wheel's highlight reads as its own
    // pill (80% of the column's width) instead of a full-bleed bar that
    // makes adjacent columns look like one continuous box.
    left: '10%',
    right: '10%',
    height: ITEM_HEIGHT,
    borderRadius: Radii.sm,
    backgroundColor: Colors.accent + '26',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: Fonts.extraBold,
    fontSize: 25.5,
    color: Colors.ink,
  },
});
