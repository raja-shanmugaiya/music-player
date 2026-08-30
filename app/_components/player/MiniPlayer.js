import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius, spacing } from '../../_theme';
import { fontFamily } from '../../_theme/typography';
import { useMusic } from '../music/MusicProvider';
import { ProgressBar, Text } from '../ui';
import { NowPlaying } from './NowPlaying';

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const [nowPlayingVisible, setNowPlayingVisible] = useState(false);
  const swipeStartRef = useRef(null);
  const movedRef = useRef(false);
  const {
    currentTrack,
    playback,
    togglePlay,
    seekTo,
    nextTrack,
    previousTrack,
    toggleFavorite,
    isFavorite,
  } = useMusic();

  if (!currentTrack) {
    return null;
  }

  const progress =
    playback?.duration > 0
      ? Math.min(playback.currentTime / playback.duration, 1)
      : 0;
  const favorite = isFavorite(currentTrack.id);
  const openNowPlaying = () => setNowPlayingVisible(true);
  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom:
            layout.tabBarHeight +
            spacing.sm +
            Math.max(insets.bottom, layout.tabBarBottomOffset),
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View
            onResponderGrant={(event) => {
              swipeStartRef.current = {
                pageY: event.nativeEvent.pageY,
                pageX: event.nativeEvent.pageX,
              };
              movedRef.current = false;
            }}
            onResponderMove={(event) => {
              if (!swipeStartRef.current) {
                return;
              }
              const dy = event.nativeEvent.pageY - swipeStartRef.current.pageY;
              const dx = event.nativeEvent.pageX - swipeStartRef.current.pageX;
              if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx) * 1.2) {
                movedRef.current = true;
              }
            }}
            onResponderRelease={(event) => {
              if (movedRef.current) {
                if (
                  event.nativeEvent.pageY - swipeStartRef.current.pageY <
                  -24
                ) {
                  openNowPlaying();
                }
                return;
              }
              openNowPlaying();
            }}
            onResponderTerminate={() => {}}
            onStartShouldSetResponder={() => true}
            style={styles.info}
          >
            <View style={styles.artwork}>
              {currentTrack?.artworkUri ? (
                <Image
                  source={{ uri: currentTrack.artworkUri }}
                  style={styles.artworkImage}
                />
              ) : (
                <Ionicons
                  color={colors.primary[500]}
                  name="musical-notes"
                  size={18}
                />
              )}
            </View>
            <View style={styles.meta}>
              <Text numberOfLines={1} style={styles.title}>
                {currentTrack.title}
              </Text>
              <Text numberOfLines={1} variant="muted">
                {currentTrack.artist}
              </Text>
            </View>
          </View>
          <Pressable hitSlop={8} onPress={() => toggleFavorite(currentTrack)}>
            <Ionicons
              color={colors.text.secondary}
              name={favorite ? 'heart' : 'heart-outline'}
              size={22}
            />
          </Pressable>
          <Pressable hitSlop={8} onPress={previousTrack}>
            <Ionicons
              color={colors.text.primary}
              name="play-skip-back"
              size={20}
            />
          </Pressable>
          <Pressable hitSlop={8} onPress={togglePlay}>
            <Ionicons
              color={colors.text.primary}
              name={playback?.playing ? 'pause' : 'play'}
              size={24}
            />
          </Pressable>
          <Pressable hitSlop={8} onPress={nextTrack}>
            <Ionicons
              color={colors.text.primary}
              name="play-skip-forward"
              size={20}
            />
          </Pressable>
        </View>
        <ProgressBar
          onSeek={(ratio) => void seekTo(ratio * playback.duration)}
          progress={progress}
          style={styles.progress}
        />
      </View>
      <NowPlaying
        visible={nowPlayingVisible}
        onClose={() => setNowPlayingVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.background.elevated,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
  progress: {
    marginTop: spacing.sm,
  },
});
