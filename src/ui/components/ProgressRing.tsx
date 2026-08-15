/**
 * Anel de progresso (SVG). Mostra o % da meta com a cor do status.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '@/ui/components/base';
import { useTheme } from '@/ui/theme';

export function ProgressRing({
  percent,
  color,
  size = 180,
  strokeWidth = 16,
  centerTop,
  centerMain,
  centerBottom,
}: {
  percent: number; // 0..100+
  color: string;
  size?: number;
  strokeWidth?: number;
  centerTop?: string;
  centerMain: string;
  centerBottom?: string;
}) {
  const t = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={t.colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash}, ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {centerTop ? <AppText variant="muted">{centerTop}</AppText> : null}
        <AppText variant="display" style={{ lineHeight: t.fontSize.display }}>
          {centerMain}
        </AppText>
        {centerBottom ? <AppText variant="muted">{centerBottom}</AppText> : null}
      </View>
    </View>
  );
}
