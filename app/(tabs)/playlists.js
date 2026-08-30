import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader, Screen } from '../_components/layout';
import { useMusic } from '../_components/music/MusicProvider';
import { PlaylistActionsSheet } from '../_components/playlist/PlaylistActionsSheet';
import { SongActionsSheet } from '../_components/player/SongActionsSheet';
import { SongRow } from '../_components/player/SongRow';
import { Button, Card, Text } from '../_components/ui';
import { colors, spacing } from '../_theme';

export default function PlaylistsScreen() {
  const {
    playlists,
    songs,
    playSong,
    currentTrack,
    exportPlaylists,
    importPlaylists,
    transferingPlaylists,
  } = useMusic();
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  const playlistRows = useMemo(
    () =>
      playlists.map((playlist) => ({
        ...playlist,
        tracks: songs.filter((song) => playlist.songIds.includes(song.id)),
      })),
    [playlists, songs],
  );

  const handleExport = async () => {
    try {
      const result = await exportPlaylists();
      if (!result) {
        return;
      }
      Alert.alert(
        'Playlists exported',
        `${result.playlistCount} playlists and ${result.trackCount} tracks were packed into a zip file.`,
      );
    } catch (error) {
      Alert.alert(
        'Export failed',
        error?.message ?? 'Could not export playlists.',
      );
    }
  };

  const handleImport = async () => {
    try {
      const result = await importPlaylists();
      if (!result) {
        return;
      }
      Alert.alert(
        'Playlists imported',
        `${result.playlistCount} playlists and ${result.trackCount} tracks were imported from zip.`,
      );
    } catch (error) {
      Alert.alert(
        'Import failed',
        error?.message ?? 'Could not import playlists.',
      );
    }
  };

  return (
    <Screen withTabBar>
      <StatusBar style="light" />
      <AppHeader />
      <Text variant="headlineSmall" style={styles.heading}>
        Playlists
      </Text>
      <View style={styles.actions}>
        <Button
          disabled={transferingPlaylists}
          label="Export ZIP"
          onPress={handleExport}
          style={styles.actionButton}
          variant="action"
        />
        <Button
          disabled={transferingPlaylists}
          label="Import ZIP"
          onPress={handleImport}
          style={styles.actionButton}
          variant="outlined"
        />
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={playlistRows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Card>
            <Text variant="label">No playlists yet</Text>
            <Text variant="muted" style={styles.copy}>
              Open a song and choose Add to Playlist to create one.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderMeta}>
                <Text variant="headlineSmall">{item.name}</Text>
                <Text variant="muted" style={styles.cardHeaderCount}>
                  {item.tracks.length}{' '}
                  {item.tracks.length === 1 ? 'song' : 'songs'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`${item.name} options`}
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setSelectedPlaylist(item)}
                style={styles.moreButton}
              >
                <Ionicons
                  color={colors.text.muted}
                  name="ellipsis-horizontal"
                  size={20}
                />
              </Pressable>
            </View>
            {item.tracks.map((song) => (
              <SongRow
                key={song.id}
                isActive={currentTrack?.id === song.id}
                song={song}
                onMore={setSelectedSong}
                onPress={playSong}
              />
            ))}
          </Card>
        )}
        showsVerticalScrollIndicator={false}
      />
      <SongActionsSheet
        song={selectedSong}
        visible={Boolean(selectedSong)}
        onClose={() => setSelectedSong(null)}
      />
      <PlaylistActionsSheet
        playlist={selectedPlaylist}
        visible={Boolean(selectedPlaylist)}
        onClose={() => setSelectedPlaylist(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeaderMeta: {
    flex: 1,
    minWidth: 0,
  },
  cardHeaderCount: {
    marginTop: spacing.xs,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
