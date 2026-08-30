import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDuration } from '../../_lib/songs';
import { colors, layout, radius, spacing } from '../../_theme';
import { fontFamily, fontSize } from '../../_theme/typography';
import { useMusic } from '../music/MusicProvider';
import { IconButton, ProgressBar, Text } from '../ui';

const ROW_HEIGHT = 64;
const SWIPE_DISTANCE = 48;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function SectionLabel({ children }) {
  return (
    <Text variant="caption" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

function QueueSongRow({
  variant,
  song,
  index,
  relativeIndex = 0,
  dragCount = 0,
  onMove,
  onPress,
  onDragStart,
  onDragEnd,
}) {
  const startYRef = useRef(0);
  const dragIndexRef = useRef(0);
  const isPlayed = variant === 'played';
  const isCurrent = variant === 'current';
  const isNext = variant === 'next';

  const trailing = isNext ? (
    <View
      collapsable={false}
      onResponderGrant={(event) => {
        startYRef.current = event.nativeEvent.pageY;
        dragIndexRef.current = relativeIndex;
        onDragStart?.();
      }}
      onResponderMove={(event) => {
        const delta = Math.round(
          (event.nativeEvent.pageY - startYRef.current) / ROW_HEIGHT,
        );
        const target = clamp(dragIndexRef.current + delta, 0, dragCount - 1);
        if (target !== dragIndexRef.current) {
          onMove?.(dragIndexRef.current, target);
          dragIndexRef.current = target;
        }
      }}
      onResponderRelease={onDragEnd}
      onResponderTerminate={onDragEnd}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => true}
      style={styles.reorderHandle}
    >
      <Ionicons color={colors.text.muted} name="reorder-three" size={22} />
    </View>
  ) : isCurrent ? (
    <Ionicons color={colors.primary[500]} name="radio" size={20} />
  ) : (
    <Ionicons color={colors.text.muted} name="checkmark-done" size={18} />
  );

  return (
    <Pressable
      disabled={!isNext}
      onPress={() => onPress?.(song)}
      style={({ pressed }) => [
        styles.queueRow,
        pressed && styles.queueRowPressed,
      ]}
    >
      <Text
        style={[
          styles.queueIndex,
          (isPlayed || isCurrent) && styles.queueRowDim,
        ]}
      >
        {index}
      </Text>
      <View style={styles.queueArtwork}>
        {song.artworkUri ? (
          <Image
            source={{ uri: song.artworkUri }}
            style={styles.queueArtworkImage}
          />
        ) : (
          <Ionicons
            color={colors.primary[500]}
            name="musical-notes"
            size={16}
          />
        )}
      </View>
      <View style={styles.queueMeta}>
        <Text
          numberOfLines={1}
          style={[
            styles.queueTitle,
            isCurrent && styles.queueTitleCurrent,
            isPlayed && styles.queueRowDim,
          ]}
        >
          {song.title}
        </Text>
        <Text
          numberOfLines={1}
          variant="muted"
          style={isPlayed && styles.queueRowDim}
        >
          {song.artist}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

function QueueHeader({ previous, currentTrack, nextCount }) {
  return (
    <>
      {previous.length > 0 && <SectionLabel>Played</SectionLabel>}
      {previous.map((song, index) => (
        <QueueSongRow
          key={song.id}
          index={index + 1}
          song={song}
          variant="played"
        />
      ))}
      <SectionLabel>Now Playing</SectionLabel>
      <QueueSongRow
        index={previous.length + 1}
        song={currentTrack}
        variant="current"
      />
      {nextCount > 0 && <SectionLabel>Up Next</SectionLabel>}
    </>
  );
}

function UpNextEmpty() {
  return (
    <Text variant="muted" style={styles.empty}>
      Nothing up next.
    </Text>
  );
}

export function NowPlaying({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    playback,
    togglePlay,
    nextTrack,
    previousTrack,
    seekTo,
    playSong,
    songs,
    upNext,
    moveUpNext,
  } = useMusic();
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const promptProgress = useState(() => new Animated.Value(0))[0];
  const swipeStartRef = useRef(null);

  useEffect(() => {
    if (!expanded) {
      return undefined;
    }

    promptProgress.setValue(0);
    const animation = Animated.timing(promptProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, promptProgress]);

  if (!visible || !currentTrack) {
    return null;
  }

  const progress =
    playback?.duration > 0
      ? Math.min(playback.currentTime / playback.duration, 1)
      : 0;
  const currentIndex = songs.findIndex((song) => song.id === currentTrack?.id);
  const previous = currentIndex > 0 ? songs.slice(0, currentIndex) : [];
  const nextBaseIndex = previous.length + 2;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View
        onMoveShouldSetResponder={(event) => {
          const start = swipeStartRef.current;
          if (!start) {
            return false;
          }
          const dy = event.nativeEvent.pageY - start.pageY;
          const dx = event.nativeEvent.pageX - start.pageX;
          return Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx) * 1.2;
        }}
        onResponderRelease={(event) => {
          const start = swipeStartRef.current;
          if (!start) {
            return;
          }
          const dy = start.pageY - event.nativeEvent.pageY;
          if (dy > SWIPE_DISTANCE) {
            setExpanded(true);
          } else if (dy < -SWIPE_DISTANCE) {
            setExpanded(false);
          }
        }}
        onResponderTerminate={() => {}}
        onTouchStart={(event) => {
          swipeStartRef.current = {
            pageY: event.nativeEvent.pageY,
            pageX: event.nativeEvent.pageX,
          };
        }}
        style={styles.page}
      >
        <View style={styles.grip} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.headerSide} />
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Now Playing
          </Text>
          <View style={styles.headerSide}>
            <IconButton
              icon={
                <Ionicons
                  color={colors.text.primary}
                  name="chevron-down"
                  size={24}
                />
              }
              onPress={onClose}
              size={40}
              tone="gray"
            />
          </View>
        </View>

        {!expanded && (
          <>
            <View style={styles.artworkWrap}>
              <View style={styles.artworkBox}>
                {currentTrack.artworkUri ? (
                  <Image
                    resizeMode="cover"
                    source={{ uri: currentTrack.artworkUri }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <Ionicons
                    color={colors.primary[500]}
                    name="musical-notes"
                    size={96}
                  />
                )}
              </View>
            </View>
            <Text numberOfLines={1} style={styles.title}>
              {currentTrack.title}
            </Text>
            <Text numberOfLines={1} variant="muted" style={styles.artist}>
              {currentTrack.artist}
            </Text>
          </>
        )}

        <View style={styles.progressSection}>
          <ProgressBar
            onSeek={(ratio) => void seekTo(ratio * playback.duration)}
            progress={progress}
          />
          <View style={styles.times}>
            <Text variant="caption">
              {formatDuration(playback.currentTime)}
            </Text>
            <Text variant="caption">{formatDuration(playback.duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <IconButton
            icon={
              <Ionicons
                color={colors.text.primary}
                name="play-skip-back"
                size={28}
              />
            }
            onPress={previousTrack}
            size={54}
            tone="gray"
          />
          <IconButton
            icon={
              <Ionicons
                color={colors.text.inverse}
                name={playback?.playing ? 'pause' : 'play'}
                size={32}
              />
            }
            onPress={togglePlay}
            size={72}
            tone="cream"
          />
          <IconButton
            icon={
              <Ionicons
                color={colors.text.primary}
                name="play-skip-forward"
                size={28}
              />
            }
            onPress={nextTrack}
            size={54}
            tone="gray"
          />
        </View>

        <Pressable
          onPress={() => setExpanded((value) => !value)}
          style={styles.upNextToggle}
        >
          <Ionicons
            color={colors.text.secondary}
            name={expanded ? 'chevron-down' : 'chevron-up'}
            size={18}
          />
          <Text style={styles.upNextToggleText}>
            {expanded
              ? 'Hide queue'
              : `Queue (${previous.length + 1 + upNext.length})`}
          </Text>
          <Ionicons
            color={colors.primary[500]}
            name="swap-vertical"
            size={18}
          />
        </Pressable>

        {expanded && (
          <Animated.View
            style={[
              styles.panel,
              {
                opacity: promptProgress,
                transform: [
                  {
                    translateY: promptProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [32, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <FlatList
              contentContainerStyle={[
                styles.panelContent,
                { paddingBottom: insets.bottom + spacing['3xl'] },
              ]}
              data={upNext}
              ItemSeparatorComponent={UpNextSeparator}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={UpNextEmpty}
              ListHeaderComponent={
                <QueueHeader
                  currentTrack={currentTrack}
                  nextCount={upNext.length}
                  previous={previous}
                />
              }
              renderItem={({ item, index }) => (
                <QueueSongRow
                  dragCount={upNext.length}
                  index={nextBaseIndex + index}
                  onDragEnd={() => setDragging(false)}
                  onDragStart={() => setDragging(true)}
                  onMove={moveUpNext}
                  onPress={playSong}
                  relativeIndex={index}
                  song={item}
                  variant="next"
                />
              )}
              scrollEnabled={!dragging}
            />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

function UpNextSeparator() {
  return <View style={styles.upNextSeparator} />;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: layout.screenPadding,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSide: {
    width: 40,
    alignItems: 'center',
  },
  artworkWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  artworkBox: {
    width: '82%',
    maxWidth: 380,
    aspectRatio: 1,
    borderRadius: radius['2xl'],
    backgroundColor: colors.background.secondary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontFamily: fontFamily.headline,
    fontSize: fontSize['2xl'],
    marginTop: spacing.sm,
  },
  artist: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  progressSection: {
    marginTop: spacing['2xl'],
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2xl'],
    marginTop: spacing['2xl'],
  },
  upNextToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  upNextToggleText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  panel: {
    flex: 1,
    marginTop: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing.md,
  },
  panelContent: {
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: ROW_HEIGHT,
  },
  queueRowPressed: {
    opacity: 0.7,
  },
  queueRowDim: {
    opacity: 0.55,
  },
  queueIndex: {
    width: 24,
    textAlign: 'center',
    color: colors.text.muted,
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
  },
  queueArtwork: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.background.elevated,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueArtworkImage: {
    width: '100%',
    height: '100%',
  },
  queueMeta: {
    flex: 1,
    minWidth: 0,
  },
  queueTitle: {
    color: colors.text.primary,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.md,
  },
  queueTitleCurrent: {
    color: colors.primary[500],
  },
  reorderHandle: {
    width: 40,
    height: 44,
    marginRight: -spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
});
