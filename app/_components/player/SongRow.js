import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../_theme';
import { fontFamily } from '../../_theme/typography';
import { formatDuration } from '../../_lib/songs';
import { Text } from '../ui';

export const SongRow = memo(function SongRow({
  song,
  onPress,
  onMore,
  isActive = false,
}) {
  return (
    <Pressable
      onLongPress={() => onMore?.(song)}
      onPress={() => onPress?.(song)}
      style={styles.row}
    >
      <View style={styles.artwork}>
        {song?.artworkUri ? (
          <Image
            source={{ uri: song.artworkUri }}
            style={styles.artworkImage}
          />
        ) : (
          <Ionicons
            color={colors.primary[500]}
            name="musical-notes"
            size={24}
          />
        )}
      </View>
      <View style={styles.meta}>
        <Text
          numberOfLines={1}
          style={[styles.title, isActive && styles.activeTitle]}
        >
          {song.title}
        </Text>
        <Text numberOfLines={1} variant="muted">
          {song.artist}
        </Text>
      </View>
      {/* <Text variant="muted">{formatDuration(song.duration)}</Text> */}
      <Pressable
        hitSlop={12}
        onPress={() => onMore?.(song)}
        style={styles.more}
      >
        <Ionicons
          color={colors.text.muted}
          name="ellipsis-horizontal"
          size={18}
        />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  artwork: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
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
    gap: 2,
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
  activeTitle: {
    color: colors.primary[500],
  },
  more: {
    paddingLeft: spacing.xs,
  },
});
