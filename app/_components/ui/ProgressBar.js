import { useState, useRef, useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../_theme';

const THUMB_SIZE = 24;
const IDLE_SCALE = 0.5;

export function ProgressBar({ progress = 0, style, onSeek }) {
  const [dragging, setDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState(0);
  const widthRef = useRef(0);
  const onSeekRef = useRef(onSeek);
  const ratioRef = useRef(0);
  const [scale] = useState(() => new Animated.Value(IDLE_SCALE));

  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  const clampedProgress = Number.isFinite(progress)
    ? Math.min(Math.max(progress, 0), 1)
    : 0;
  const displayedRatio = dragging ? dragRatio : clampedProgress;

  const animateScale = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 8,
    }).start();
  };

  const handleGrant = (event) => {
    ratioRef.current = computeRatio(event, widthRef, ratioRef);
    setDragRatio(ratioRef.current);
    setDragging(true);
    animateScale(1);
  };

  const handleMove = (event) => {
    ratioRef.current = computeRatio(event, widthRef, ratioRef);
    setDragRatio(ratioRef.current);
  };

  const handleRelease = () => {
    if (onSeekRef.current) {
      onSeekRef.current(ratioRef.current);
    }
    setDragging(false);
    animateScale(IDLE_SCALE);
  };

  const handleTerminate = () => {
    setDragging(false);
    animateScale(IDLE_SCALE);
  };

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
        widthRef.current = event.nativeEvent.layout.width;
      }}
      style={[styles.container, style]}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${displayedRatio * 100}%` }]} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: `${displayedRatio * 100}%`,
            transform: [{ translateX: -THUMB_SIZE / 2 }, { scale }],
          },
        ]}
      />
    </View>
  );
}

function computeRatio(event, widthRef, ratioRef) {
  const localX = event.nativeEvent.locationX;
  if (!widthRef.current) {
    return ratioRef.current;
  }
  return Math.min(Math.max(localX / widthRef.current, 0), 1);
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
    top: '50%',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginTop: -THUMB_SIZE / 2,
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
