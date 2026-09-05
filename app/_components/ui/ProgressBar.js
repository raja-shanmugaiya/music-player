import { useState, useRef, useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../_theme';

const THUMB_SIZE = 24;
const IDLE_SCALE = 0.5;

export function ProgressBar({ progress = 0, style, onSeek }) {
  const [dragging, setDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const onSeekRef = useRef(onSeek);
  const ratioRef = useRef(0);
  const pendingSeekRef = useRef(null);
  const [scale] = useState(() => new Animated.Value(IDLE_SCALE));
  const [position] = useState(() => new Animated.Value(0));

  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  const clampedProgress = Number.isFinite(progress)
    ? Math.min(Math.max(progress, 0), 1)
    : 0;

  useEffect(() => {
    if (dragging) {
      return undefined;
    }

    if (pendingSeekRef.current != null) {
      if (Math.abs(clampedProgress - pendingSeekRef.current) > 0.03) {
        return undefined;
      }
      pendingSeekRef.current = null;
    }

    Animated.timing(position, {
      toValue: clampedProgress,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, dragging, position]);

  const animateScale = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 8,
    }).start();
  };

  const handleGrant = (event) => {
    ratioRef.current = computeRatio(event, trackWidth, ratioRef);
    position.setValue(ratioRef.current);
    setDragging(true);
    animateScale(1);
  };

  const handleMove = (event) => {
    ratioRef.current = computeRatio(event, trackWidth, ratioRef);
    position.setValue(ratioRef.current);
  };

  const handleRelease = () => {
    if (onSeekRef.current) {
      onSeekRef.current(ratioRef.current);
    }
    pendingSeekRef.current = ratioRef.current;
    setDragging(false);
    animateScale(IDLE_SCALE);
  };

  const handleTerminate = () => {
    pendingSeekRef.current = null;
    setDragging(false);
    animateScale(IDLE_SCALE);
  };

  const width = Math.max(trackWidth, 1);
  const translateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - THUMB_SIZE],
  });
  const fillWidth = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  return (
    <View
      onStartShouldSetResponder={() => Boolean(onSeekRef.current)}
      onMoveShouldSetResponder={() => Boolean(onSeekRef.current)}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleTerminate}
      onResponderTerminationRequest={() => false}
      onLayout={(event) => {
        setTrackWidth(event.nativeEvent.layout.width);
        position.setValue(clampedProgress);
      }}
      style={[styles.container, style]}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { transform: [{ translateX }] }]}
      >
        <Animated.View
          style={[styles.thumbInner, { transform: [{ scale }] }]}
        />
      </Animated.View>
    </View>
  );
}

function computeRatio(event, trackWidth, ratioRef) {
  const localX = event.nativeEvent.locationX;
  if (!trackWidth) {
    return ratioRef.current;
  }
  return Math.min(Math.max(localX / trackWidth, 0), 1);
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    backgroundColor: colors.secondary[700],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginTop: -THUMB_SIZE / 2,
  },
  thumbInner: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary[500],
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
