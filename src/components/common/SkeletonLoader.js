import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

/**
 * SkeletonLoader — shimmer animation using React Native's built-in Animated API.
 * Does NOT require react-native-reanimated or any Babel plugin.
 * Uses a translate-based highlight sweep for a premium shimmer look.
 */
const SkeletonLoader = ({ width, height, style, borderRadius = 8 }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  // Sweep the highlight from left edge to right edge
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: '#E2E8F0',
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Skewed white strip sweeping left → right */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.shimmerStrip,
          { transform: [{ translateX }, { skewX: '-20deg' }] },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerStrip: {
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
});

export default SkeletonLoader;
