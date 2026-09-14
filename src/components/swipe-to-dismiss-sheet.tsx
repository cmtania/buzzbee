import { ReactNode, useRef } from 'react';
import { Animated, PanResponder, StyleProp, ViewStyle } from 'react-native';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.8;

/**
 * A bottom-sheet container that can be swiped down to dismiss, built on the
 * core PanResponder/Animated APIs (no gesture-handler dependency — this app
 * is already mid-testing on a built dev client, and adding a new native
 * module would mean another EAS build just for this).
 *
 * The move-threshold in onMoveShouldSetPanResponder means a normal tap on a
 * child Pressable (near-zero movement) never gets claimed by the responder,
 * so this can safely wrap the whole sheet without blocking row/card taps.
 *
 * The root claims the responder for any touch that *starts* on it too (via
 * onStartShouldSetResponder), so a stationary tap on non-interactive space
 * inside the sheet (padding, gaps between rows) doesn't fall through to the
 * screen's backdrop Pressable behind it and dismiss the whole sheet — only
 * a tap truly outside the sheet, on the dimmed backdrop, should do that.
 * This only affects taps that no deeper view already wants: React Native's
 * responder negotiation asks the innermost touched view first, so a tap
 * that lands on an actual child Pressable (a button, a row) is claimed by
 * that Pressable before this ever gets asked, and works exactly as before.
 *
 * IMPORTANT: this must stay a plain Animated.View, not a Pressable/
 * TouchableOpacity — those manage their own internal touch responder
 * (Pressability) which fights over the same gesture responder as
 * PanResponder on one component, and swallows move events before
 * onPanResponderMove ever sees them, silently breaking the swipe-to-dismiss
 * gesture on the sheet's body (confirmed: this happened when the root was
 * briefly changed to a Pressable to solve the tap-swallowing problem above —
 * the fix belongs on onStartShouldSetResponder instead, not the component
 * type).
 */
export function SwipeToDismissSheet({
  onDismiss,
  style,
  children,
  disabled,
}: {
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /**
   * Disables the swipe gesture — set while a nested overlay (e.g. a time
   * picker Modal) is open above this sheet. RN's `<Modal>` presents in its
   * own native layer, but its touches were still reaching this sheet's
   * PanResponder underneath, closing the whole sheet on a swipe meant for
   * the picker instead. Read via a ref since the PanResponder instance is
   * created once and its callbacks would otherwise close over a stale
   * value.
   */
  disabled?: boolean;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabledRef.current && gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 180,
            useNativeDriver: true,
          }).start(onDismiss);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[style, { transform: [{ translateY }] }]}
      {...pan.panHandlers}
      onStartShouldSetResponder={() => !disabledRef.current}>
      {children}
    </Animated.View>
  );
}
