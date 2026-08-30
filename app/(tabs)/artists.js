import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AppHeader, Screen } from '../_components/layout';
import { useMusic } from '../_components/music/MusicProvider';
import { SongActionsSheet } from '../_components/player/SongActionsSheet';
import { SongRow } from '../_components/player/SongRow';
import { Text } from '../_components/ui';
import { colors, radius, spacing } from '../_theme';

export default function ArtistsScreen() {
  const { songs, playSong, currentTrack } = useMusic();
  const [openArtist, setOpenArtist] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);

  const artists = useMemo(() => {
    const grouped = new Map();
    songs.forEach((song) => {
      const name = song.artist || 'Unknown Artist';
      const current = grouped.get(name) ?? [];
      current.push(song);
      grouped.set(name, current);
    });

    return [...grouped.entries()]
      .map(([name, tracks]) => ({ name, tracks }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  return (
    <Screen withTabBar>
      <StatusBar style="light" />
      <AppHeader />
      <Text variant="headlineSmall" style={styles.heading}>
        Artists
      </Text>
      <FlatList
        contentContainerStyle={styles.list}
        data={artists}
        keyExtractor={(item) => item.name}
        ListEmptyComponent={
          <Text variant="muted">
            Artists from your local files will appear here.
          </Text>
        }
        renderItem={({ item }) => {
          const isOpen = openArtist === item.name;
          return (
            <View style={styles.group}>
              <Pressable
                style={styles.artistRow}
                onPress={() => setOpenArtist(isOpen ? null : item.name)}
              >
                <View style={styles.avatar}>
                  <Ionicons
                    color={colors.primary[500]}
                    name="person"
                    size={20}
                  />
                </View>
                <View style={styles.meta}>
                  <Text numberOfLines={1}>{item.name}</Text>
                  <Text variant="muted">
                    {item.tracks.length}{' '}
                    {item.tracks.length === 1 ? 'song' : 'songs'}
                  </Text>
                </View>
              </Pressable>
              {isOpen
                ? item.tracks.map((song) => (
                    <SongRow
                      key={song.id}
                      isActive={currentTrack?.id === song.id}
                      song={song}
                      onMore={setSelectedSong}
                      onPress={playSong}
                    />
                  ))
                : null}
            </View>
          );
        }}
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
  group: {
    gap: spacing.sm,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
});
