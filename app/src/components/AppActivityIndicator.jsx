import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Easing,
  Platform,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native';

const SPOKE_COUNT = 12;
// 12 opacities for the classic iOS flower trail
const OPACITIES = [1.0, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.28, 0.2, 0.14];

export const AppActivityIndicator = ({
  size = 'small',
  color = '#38bdf8',
  style,
  animating = true,
  hidesWhenStopped = true,
  ...props
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animating) return;

    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animating, spinAnim]);

  if (!animating && hidesWhenStopped) {
    return null;
  }

  // On iOS, native ActivityIndicator is already the clean iOS flower spinner
  if (Platform.OS === 'ios') {
    return (
      <RNActivityIndicator
        size={size}
        color={color}
        style={style}
        animating={animating}
        hidesWhenStopped={hidesWhenStopped}
        {...props}
      />
    );
  }

  // On Android, render the exact 12-spoke iOS-style flower spinner with 60 FPS native driver rotation
  const isLarge = size === 'large' || (typeof size === 'number' && size > 30);
  const dimension = typeof size === 'number' ? size : isLarge ? 36 : 22;
  const spokeWidth = isLarge ? 3.2 : 2.2;
  const spokeLength = isLarge ? 9.5 : 5.5;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={[
        {
          width: dimension,
          height: dimension,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={{
          width: dimension,
          height: dimension,
          transform: [{ rotate: spin }],
        }}
      >
        {OPACITIES.map((opacity, index) => {
          const angle = (360 / SPOKE_COUNT) * index;
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                width: dimension,
                height: dimension,
                alignItems: 'center',
                justifyContent: 'flex-start',
                transform: [{ rotate: `${angle}deg` }],
              }}
            >
              <View
                style={{
                  width: spokeWidth,
                  height: spokeLength,
                  borderRadius: spokeWidth / 2,
                  backgroundColor: color,
                  opacity: opacity,
                }}
              />
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
};

export default AppActivityIndicator;
