import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { FloatingTabBar } from '../_components/layout';
import { MiniPlayer } from '../_components/player/MiniPlayer';
import { colors } from '../_theme';

function AppTabBar(props) {
  return (
    <>
      <MiniPlayer />
      <FloatingTabBar {...props} />
    </>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Songs',
            tabBarIcon: 'musical-notes-outline',
            tabBarIconActive: 'musical-notes',
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: 'Playlists',
            tabBarIcon: 'list-outline',
            tabBarIconActive: 'list',
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favorites',
            tabBarIcon: 'heart-outline',
            tabBarIconActive: 'heart',
          }}
        />
        <Tabs.Screen
          name="artists"
          options={{
            title: 'Artists',
            tabBarIcon: 'person-outline',
            tabBarIconActive: 'person',
          }}
        />
      </Tabs>
    </View>
  );
}
