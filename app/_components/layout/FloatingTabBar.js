import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, layout, radius, spacing } from '../../_theme';
import { fontFamily, fontSize } from '../../_theme/typography';
import { Text } from '../ui';

export function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        { bottom: Math.max(insets.bottom, layout.tabBarBottomOffset) },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconName = isFocused
            ? (options.tabBarIconActive ?? options.tabBarIcon ?? 'ellipse')
            : (options.tabBarIcon ?? 'ellipse-outline');

          return (
            <Pressable
              key={route.key}
              accessibilityLabel={options.title}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              <View
                style={[styles.iconWrap, isFocused && styles.iconWrapActive]}
              >
                <Ionicons
                  color={isFocused ? colors.primary[500] : colors.text.muted}
                  name={iconName}
                  size={layout.iconSize.md}
                />
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {options.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.tabBarHeight,
    backgroundColor: colors.background.secondary,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.16)',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  label: {
    color: colors.text.muted,
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs,
  },
  labelActive: {
    color: colors.text.primary,
  },
});
