import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../_theme';
import { useMusic } from '../music/MusicProvider';
import { Button, Text } from '../ui';

export function PlaylistActionsSheet({ playlist, visible, onClose }) {
  const { playlists, mergePlaylists, deletePlaylist } = useMusic();
  const [showMergeTargets, setShowMergeTargets] = useState(false);

  if (!playlist) {
    return null;
  }

  const reset = () => {
    setShowMergeTargets(false);
    onClose();
  };

  const handleMerge = async (target) => {
    await mergePlaylists(playlist.id, target.id);
    Alert.alert(
      'Playlist merged',
      `"${playlist.name}" was merged into "${target.name}".`,
    );
    reset();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete playlist',
      `Delete "${playlist.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlaylist(playlist.id);
            reset();
          },
        },
      ],
    );
  };

  const mergeTargets = playlists.filter((item) => item.id !== playlist.id);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={reset}
    >
      <Pressable style={styles.backdrop} onPress={reset}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text numberOfLines={1} variant="headlineSmall">
            {playlist.name}
          </Text>
          <Text variant="muted" style={styles.meta}>
            {playlist.songIds.length}{' '}
            {playlist.songIds.length === 1 ? 'song' : 'songs'}
          </Text>

          {showMergeTargets ? (
            <View style={styles.actions}>
              <Text variant="caption" style={styles.pickerLabel}>
                Merge into
              </Text>
              {mergeTargets.map((target) => (
                <Pressable
                  key={target.id}
                  style={styles.action}
                  onPress={() => handleMerge(target)}
                >
                  <Ionicons
                    color={colors.primary[500]}
                    name="albums-outline"
                    size={20}
                  />
                  <View style={styles.actionMeta}>
                    <Text numberOfLines={1}>{target.name}</Text>
                    <Text numberOfLines={1} variant="caption">
                      {target.songIds.length}{' '}
                      {target.songIds.length === 1 ? 'song' : 'songs'}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {mergeTargets.length === 0 && (
                <Text variant="muted" style={styles.empty}>
                  No other playlists to merge into.
                </Text>
              )}
              <Button
                label="Back"
                variant="secondary"
                onPress={() => setShowMergeTargets(false)}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={styles.action}
                onPress={() => setShowMergeTargets(true)}
              >
                <Ionicons
                  color={colors.primary[500]}
                  name="git-merge"
                  size={20}
                />
                <Text>Merge into playlist</Text>
              </Pressable>
              <Pressable style={styles.action} onPress={handleDelete}>
                <Ionicons
                  color={colors.accent.danger}
                  name="trash-outline"
                  size={20}
                />
                <Text>Delete playlist</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginBottom: spacing.lg,
  },
  meta: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.elevated,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  actionMeta: {
    flex: 1,
    minWidth: 0,
  },
  pickerLabel: {
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
