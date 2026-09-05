import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader, Screen } from '../_components/layout';
import { useMusic } from '../_components/music/MusicProvider';
import { SongActionsSheet } from '../_components/player/SongActionsSheet';
import { SongRow } from '../_components/player/SongRow';
import { Button, SearchBar, Text } from '../_components/ui';
import { colors, spacing } from '../_theme';
import { LIBRARY_FOLDER_NAME } from '../_lib/musicLibrary';

const VIEW_OPTIONS = [
  { key: 'all', label: 'All Songs' },
  { key: 'folder', label: 'Folder wise' },
];

export default function SongsScreen() {
  const {
    songs,
    loading,
    error,
    permission,
    libraryFolderHint,
    requestAccess,
    playSong,
    playSongFromList,
    currentTrack,
  } = useMusic();
  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [view, setView] = useState('all');
  const [collapsedFolders, setCollapsedFolders] = useState({});

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

  const fullFolderMap = useMemo(() => {
    const map = {};
    for (const song of songs) {
      const folder = song.folder || LIBRARY_FOLDER_NAME;
      (map[folder] = map[folder] || []).push(song);
    }
    return map;
  }, [songs]);

  const folderSections = useMemo(() => {
    if (view !== 'folder') {
      return [];
    }

    const map = {};
    for (const song of filteredSongs) {
      const folder = song.folder || LIBRARY_FOLDER_NAME;
      (map[folder] = map[folder] || []).push(song);
    }

    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .map((folder) => ({
        title: folder,
        songCount: map[folder].length,
        data: collapsedFolders[folder] ? [] : map[folder],
      }));
  }, [collapsedFolders, filteredSongs, view]);

  const toggleFolder = (folder) => {
    setCollapsedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const granted = permission?.granted;

  const handlePlayFromFolder = (song) => {
    const folder = song.folder || LIBRARY_FOLDER_NAME;
    playSongFromList(song, fullFolderMap[folder] || [song]);
  };

  const toggle = (
    <View style={styles.toggleContainer}>
      {VIEW_OPTIONS.map((option) => {
        const active = view === option.key;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            onPress={() => setView(option.key)}
            style={[styles.toggleOption, active && styles.toggleOptionActive]}
          >
            <Text
              style={active ? styles.toggleLabelActive : styles.toggleLabel}
              variant="label"
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderSong = (item) => (
    <SongRow
      isActive={currentTrack?.id === item.id}
      song={item}
      onMore={setSelectedSong}
      onPress={view === 'folder' ? () => handlePlayFromFolder(item) : playSong}
    />
  );

  return (
    <Screen withTabBar>
      <StatusBar style="light" />
      <AppHeader />
      <SearchBar
        placeholder="Search your library"
        value={query}
        onChangeText={setQuery}
      />
      {toggle}

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
      ) : view === 'folder' ? (
        <SectionList
          contentContainerStyle={styles.list}
          sections={folderSections}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          ListEmptyComponent={
            <Text variant="muted" style={styles.emptyCopy}>
              {error ||
                (query ? 'No songs match your search.' : libraryFolderHint)}
            </Text>
          }
          renderItem={({ item }) => renderSong(item)}
          renderSectionHeader={({ section }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => toggleFolder(section.title)}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionHeaderRow}>
                <Text
                  numberOfLines={1}
                  variant="label"
                  style={styles.sectionHeaderText}
                >
                  {section.title}
                </Text>
                <Ionicons
                  color={colors.text.muted}
                  name={
                    collapsedFolders[section.title]
                      ? 'chevron-forward'
                      : 'chevron-down'
                  }
                  size={16}
                />
              </View>
              <Text variant="caption">{section.songCount} songs</Text>
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          ListEmptyComponent={
            <Text variant="muted" style={styles.emptyCopy}>
              {error ||
                (query ? 'No songs match your search.' : libraryFolderHint)}
            </Text>
          }
          renderItem={({ item }) => renderSong(item)}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.input,
    borderRadius: 10,
    padding: spacing.xs,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: colors.primary[500],
  },
  toggleLabel: {
    color: colors.text.muted,
  },
  toggleLabelActive: {
    color: colors.text.inverse,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeaderText: {
    color: colors.text.primary,
    flexShrink: 1,
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
