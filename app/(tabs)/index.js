import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppHeader, Screen } from '../_components/layout';
import { useMusic } from '../_components/music/MusicProvider';
import { SongActionsSheet } from '../_components/player/SongActionsSheet';
import { SongRow } from '../_components/player/SongRow';
import { Button, SearchBar, Text } from '../_components/ui';
import { colors, spacing } from '../_theme';

export default function SongsScreen() {
  const {
    songs,
    loading,
    error,
    permission,
    libraryFolderHint,
    requestAccess,
    loadSongs,
    playSong,
    currentTrack,
  } = useMusic();
  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);

  const filteredSongs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return songs;
    }

    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term),
    );
  }, [query, songs]);

  const granted = permission?.granted;

  return (
    <Screen withTabBar>
      <StatusBar style="light" />
      <AppHeader />
      <SearchBar
        placeholder="Search your library"
        value={query}
        onChangeText={setQuery}
      />

      {!granted ? (
        <View style={styles.empty}>
          <Text variant="headlineSmall">Allow file storage</Text>
          <Text variant="muted" style={styles.emptyCopy}>
            King Music needs file storage permission to create its folder in
            Files and read MP3s from there.
          </Text>
          <Button
            label="Allow file storage"
            variant="action"
            onPress={requestAccess}
          />
          {permission?.canAskAgain === false ? (
            <Button
              label="Open Settings"
              style={styles.settingsButton}
              variant="outlined"
              onPress={() => Linking.openSettings()}
            />
          ) : null}
        </View>
      ) : loading && songs.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary[500]} />
          <Text variant="muted">Reading MP3 files from the app folder...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          ListEmptyComponent={
            <Text variant="muted" style={styles.emptyCopy}>
              {error ||
                (query
                  ? 'No songs match your search.'
                  : libraryFolderHint)}
            </Text>
          }
          renderItem={({ item }) => (
            <SongRow
              isActive={currentTrack?.id === item.id}
              song={item}
              onMore={setSelectedSong}
              onPress={playSong}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <SongActionsSheet
        song={selectedSong}
        visible={Boolean(selectedSong)}
        onClose={() => setSelectedSong(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyCopy: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  settingsButton: {
    alignSelf: 'stretch',
  },
});
