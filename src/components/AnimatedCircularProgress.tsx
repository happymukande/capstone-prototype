import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useAppTheme } from '../context/ThemeContext';
import { getThemePalette } from '../utils/themePalette';

interface AnimatedCircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  durationMs?: number;
  trackColor?: string;
  progressColor?: string;
  textColor?: string;
  labelColor?: string;
  label?: string;
}

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, progress));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function AnimatedCircularProgress({
  progress,
  size = 124,
  strokeWidth = 10,
  durationMs = 650,
  trackColor,
  progressColor,
  textColor,
  labelColor,
  label,
}: AnimatedCircularProgressProps) {
  const { colors, isDarkMode } = useAppTheme();
  const palette = useMemo(() => getThemePalette(colors, isDarkMode), [colors, isDarkMode]);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const currentProgressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const clampedProgress = clampProgress(progress);
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const resolvedTrackColor = trackColor ?? palette.progressTrack;
  const resolvedProgressColor = progressColor ?? colors.primary;
  const resolvedTextColor = textColor ?? colors.textPrimary;
  const resolvedLabelColor = labelColor ?? colors.textMuted;

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startProgress = currentProgressRef.current;
    const endProgress = clampedProgress;
    const delta = endProgress - startProgress;

    if (delta === 0) {
      setAnimatedProgress(endProgress);
      return;
    }

    const startTime = Date.now();
    const duration = Math.max(180, durationMs);

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const raw = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(raw);
      const next = startProgress + delta * eased;

      setAnimatedProgress(next);

      if (raw < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        currentProgressRef.current = endProgress;
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [clampedProgress, durationMs]);

  const percentage = Math.round(animatedProgress);
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} accessible accessibilityRole="image">
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={resolvedTrackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={resolvedProgressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            fill="transparent"
          />
        </G>
      </Svg>
      <View style={styles.centerContent}>
        <Text style={[styles.percentageText, { color: resolvedTextColor }]}>{percentage}%</Text>
        {label ? <Text style={[styles.labelText, { color: resolvedLabelColor }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  labelText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
});
