import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../_theme';
import { fontFamily, fontSize } from '../../_theme/typography';
import { useMusic } from '../music/MusicProvider';
import { Button, Text } from '../ui';

export function SongActionsSheet({ song, visible, onClose }) {
  const {
    addToQueue,
    toggleFavorite,
    isFavorite,
    playlists,
    addToPlaylist,
    createPlaylist,
  } = useMusic();
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!song) {
    return null;
  }

  const favorite = isFavorite(song.id);

  const reset = () => {
    setShowPlaylists(false);
    setNewPlaylistName('');
    onClose();
  };

  const handleQueue = () => {
    addToQueue(song);
    Alert.alert('Added to queue', `"${song.title}" will play next.`);
    reset();
  };

  const handleFavorite = async () => {
    await toggleFavorite(song);
    reset();
  };

  const handleCreatePlaylist = async () => {
    const playlist = await createPlaylist(newPlaylistName, song);
    if (!playlist) {
      return;
    }
    Alert.alert(
      'Playlist created',
      `"${song.title}" was added to ${playlist.name}.`,
    );
    reset();
  };

  const handleAddToPlaylist = async (playlist) => {
    await addToPlaylist(playlist.id, song);
    Alert.alert(
      'Added to playlist',
      `"${song.title}" was added to ${playlist.name}.`,
    );
    reset();
  };

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
            {song.title}
          </Text>
          <Text variant="muted" style={styles.artist}>
            {song.artist}
          </Text>

          {showPlaylists ? (
            <View style={styles.actions}>
              {playlists.map((playlist) => (
                <Pressable
                  key={playlist.id}
                  style={styles.action}
                  onPress={() => handleAddToPlaylist(playlist)}
                >
                  <Ionicons color={colors.primary[500]} name="list" size={20} />
                  <Text>{playlist.name}</Text>
                </Pressable>
              ))}
              <TextInput
                placeholder="New playlist name"
                placeholderTextColor={colors.text.muted}
                style={styles.input}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <Button
                label="Create playlist"
                variant="action"
                onPress={handleCreatePlaylist}
              />
              <Button
                label="Back"
                variant="secondary"
                onPress={() => setShowPlaylists(false)}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={styles.action}
                onPress={() => setShowPlaylists(true)}
              >
                <Ionicons color={colors.primary[500]} name="list" size={20} />
                <Text>Add to Playlist</Text>
              </Pressable>
              <Pressable style={styles.action} onPress={handleQueue}>
                <Ionicons
                  color={colors.primary[500]}
                  name="albums-outline"
                  size={20}
                />
                <Text>Add to Queue</Text>
              </Pressable>
              <Pressable style={styles.action} onPress={handleFavorite}>
                <Ionicons
                  color={colors.primary[500]}
                  name={favorite ? 'heart' : 'heart-outline'}
                  size={20}
                />
                <Text>
                  {favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
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
  artist: {
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
  input: {
    backgroundColor: colors.background.input,
    borderRadius: radius.md,
    color: colors.text.secondary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
