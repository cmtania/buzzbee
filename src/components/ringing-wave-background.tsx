import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** The amber top-wave background shared by the Ringing and Mission Complete screens. */
export function RingingWaveBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 540 960" preserveAspectRatio="none">
        <Rect x="0" y="0" width="540" height="960" fill={Colors.bg} />
        <Path
          d="M0 234L11.3 232.5C22.7 231 45.3 228 67.8 224.3C90.3 220.7 112.7 216.3 135.2 214.7C157.7 213 180.3 214 202.8 219.2C225.3 224.3 247.7 233.7 270.2 233.3C292.7 233 315.3 223 337.8 218.5C360.3 214 382.7 215 405.2 220.3C427.7 225.7 450.3 235.3 472.8 234.7C495.3 234 517.7 223 528.8 217.5L540 212L540 0L528.8 0C517.7 0 495.3 0 472.8 0C450.3 0 427.7 0 405.2 0C382.7 0 360.3 0 337.8 0C315.3 0 292.7 0 270.2 0C247.7 0 225.3 0 202.8 0C180.3 0 157.7 0 135.2 0C112.7 0 90.3 0 67.8 0C45.3 0 22.7 0 11.3 0L0 0Z"
          fill={Colors.accent}
        />
      </Svg>
    </View>
  );
}
