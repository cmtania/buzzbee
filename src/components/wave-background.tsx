import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** The amber bottom-wave background used on Login and Home in the design mockups. */
export function WaveBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 540 960" preserveAspectRatio="none">
        <Rect x="0" y="0" width="540" height="960" fill="#F2F3F4" />
        <Path
          d="M0 846L11.3 839.7C22.7 833.3 45.3 820.7 67.8 813.7C90.3 806.7 112.7 805.3 135.2 797C157.7 788.7 180.3 773.3 202.8 782.8C225.3 792.3 247.7 826.7 270.2 845C292.7 863.3 315.3 865.7 337.8 858.3C360.3 851 382.7 834 405.2 818.2C427.7 802.3 450.3 787.7 472.8 781.2C495.3 774.7 517.7 776.3 528.8 777.2L540 778L540 961L528.8 961C517.7 961 495.3 961 472.8 961C450.3 961 427.7 961 405.2 961C382.7 961 360.3 961 337.8 961C315.3 961 292.7 961 270.2 961C247.7 961 225.3 961 202.8 961C180.3 961 157.7 961 135.2 961C112.7 961 90.3 961 67.8 961C45.3 961 22.7 961 11.3 961L0 961Z"
          fill={Colors.accent}
        />
      </Svg>
    </View>
  );
}
