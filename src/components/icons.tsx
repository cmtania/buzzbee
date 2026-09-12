import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

export function ChevronRight({ size = 15, color = '#9C8C7A', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowRight({ size = 18, color = '#2B2420', strokeWidth = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5l7 7-7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WaveformIcon({ size = 14, color = '#2B2420', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12c1.5-4 3.5-4 5 0s3.5 4 5 0 3.5-4 5 0 3.5 4 5 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 15, color = '#6B5D4F', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LongArrowRight({ size = 16, color = '#9C8C7A', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BackArrow({ size = 15, color = '#6B5D4F', strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"
        fill="#fff"
        stroke="#E8790A"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HomeTabIcon({ size = 20, color = '#9C8C7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11l8-7 8 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10v9h12v-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HistoryTabIcon({ size = 20, color = '#9C8C7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l3.5 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SettingsTabIcon({ size = 20, color = '#9C8C7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      <Path
        d="M19 12a7 7 0 0 0-.1-1.1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14 3h-4l-.6 2.8a7 7 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.9 1.1L10 21h4l.6-2.8a7 7 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.6c.1-.4.1-.7.1-1.1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MathIcon({ size = 20, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="4" stroke={color} strokeWidth={2} />
      <Path d="M8 12h8M12 8v8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ClapIcon({ size = 20, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 13l-3-5a1.8 1.8 0 0 1 3-2l2 3M12 11l-2.5-4.3a1.8 1.8 0 0 1 3-1.8L15 9M16 12l-1.5-2.5a1.7 1.7 0 0 1 2.8-1.8L19 11a7 7 0 0 1-2 9l-1 .8a5 5 0 0 1-6 0l-4-3a3 3 0 0 1 3-5l3 1.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShakeIcon({ size = 20, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="7" y="3" width="10" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M4 9l-1.5 1.5M20 9l1.5 1.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BuzzIcon({ size = 20, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5 6 9H3v6h3l5 4z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M16 8a5 5 0 0 1 0 8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function TapIcon({ size = 20, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function RandomIcon({ size = 20, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 17h3l9-11h4M4 7h3l3 3.6M20 17h-4l-2.4-2.9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M18 4l3 2-3 2M18 20l3-2-3-2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BackspaceIcon({ size = 22, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M12 10l5 5M17 10l-5 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 14, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MoonIcon({ size = 16, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalendarIcon({ size = 16, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="5" width="16" height="16" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M4 10h16M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MicIcon({ size = 16, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M6 11v1a6 6 0 0 0 12 0v-1M12 19v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function StopwatchIcon({ size = 16, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={2} />
      <Path d="M12 9v4l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 2h4M12 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ size = 16, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function InfoIcon({ size = 16, color = '#2B2420' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 8h.01M11 12h1v5h1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Streak badge icon (spiral + wind lines), ported from design/Main.dc.html. */
export function StreakIcon({ size = 12, color = '#F5A623' }: IconProps) {
  const height = size * (193 / 133);
  return (
    <Svg width={size} height={height} viewBox="0 0 133 193">
      <G transform="matrix(1,0,0,1,-770.116583231,-396.886209288)">
        <Path
          d="M882.4586075265507,404.06997300441486 C894.6432780708984,410.05999042458916 897.2014311304926,429.8553524162319 888.1660287223727,448.2348317826446 C879.1306263142528,466.61431114905736 861.8935438557278,476.6782811298598 849.70887331138,470.6882637096855 C837.5242027670323,464.6982462895112 834.9660497074382,444.90288429786847 844.001452115558,426.52340493145573 C853.0368545236779,408.143925565043 870.2739369822029,398.07995558424057 882.4586075265507,404.06997300441486 Z"
          fill="#f2f3f4"
          strokeWidth={11}
          strokeLinecap="round"
          stroke={color}
        />
        <Path
          d="M868.6263157324323,423.2696144445742 C897.2629185049874,434.851196007862 906.14800766094,479.8061060678122 888.4495807967589,523.5672121861027 C870.7511539325777,567.3283183043931 833.1131718033151,593.4677721824822 804.4765690307601,581.8861906191944 C775.839966258205,570.3046090559067 766.9548771022523,525.3496989959564 784.6533039664334,481.588592877666 C802.3517308306147,437.8274867593755 839.9897129598772,411.6880328812864 868.6263157324323,423.2696144445742 Z"
          fill="#f2f3f4"
          strokeWidth={11}
          strokeLinecap="round"
          stroke={color}
        />
        <Path
          d="M0,0 C18.049493489455386,-4.185845979452003 36.09898697891077,-8.371691958904005 50.80756298160196,-3.144713359617924 C65.51613898429315,2.082265239668157 76.88379750022015,16.72206841769232 88.25145601614713,31.36187159571648"
          transform="matrix(1,0,0,1,775.643075912,530.697848816)"
          fill="none"
          strokeWidth={11}
          strokeLinecap="round"
          stroke={color}
        />
        <Path
          d="M0,0 C21.819811723218805,-3.592812050069501 43.63962344643761,-7.185624100139002 60.799425249948285,-1.554694438460814 C77.95922705345896,4.076235223217374 90.45901893726155,18.930906596643247 102.9588108210641,33.78557797006911"
          transform="matrix(1,0,0,1,782.109137051,488.41399093)"
          fill="none"
          strokeWidth={11}
          strokeLinecap="round"
          stroke={color}
        />
        <Path
          d="M0,0 C16.170957058269114,-0.09778077297723797 32.34191411653823,-0.19556154595447595 46.721408050956995,4.831992811521303 C61.100901985375764,9.859547168997082 73.68893279594417,20.01243665692588 86.27696360651254,30.165326144854674"
          transform="matrix(1,0,0,1,807.056369727,445.390229411)"
          fill="none"
          strokeWidth={11}
          strokeLinecap="round"
          stroke={color}
        />
      </G>
    </Svg>
  );
}
