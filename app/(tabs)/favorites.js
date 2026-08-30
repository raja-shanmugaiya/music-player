import { useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppHeader, Screen } from '../_components/layout';
import { useMusic } from '../_components/music/MusicProvider';
import { SongActionsSheet } from '../_components/player/SongActionsSheet';
import { SongRow } from '../_components/player/SongRow';
import { Text } from '../_components/ui';
import { spacing } from '../_theme';

export default function FavoritesScreen() {
  const { songs, favoriteIds, playSong, currentTrack } = useMusic();
  const [selectedSong, setSelectedSong] = useState(null);

  const favorites = useMemo(
    () => songs.filter((song) => favoriteIds.includes(song.id)),
    [favoriteIds, songs],
  );

  return (
    <Screen withTabBar>
      <StatusBar style="light" />
      <AppHeader />
      <Text variant="headlineSmall" style={styles.heading}>
        Favorites
      </Text>
      <FlatList
        contentContainerStyle={styles.list}
        data={favorites}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text variant="muted">Songs you favorite will show up here.</Text>
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
      <SongActionsSheet
        song={selectedSong}
        visible={Boolean(selectedSong)}
        onClose={() => setSelectedSong(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
});
