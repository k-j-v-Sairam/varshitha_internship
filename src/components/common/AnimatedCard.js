import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AnimatedCard = ({ children, onPress, style, disabled = false }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (disabled || !onPress) return;
    scale.value = withSpring(0.96, {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    });
    opacity.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    if (disabled || !onPress) return;
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    });
    opacity.value = withTiming(1, { duration: 100 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.card, animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});

export default AnimatedCard;
