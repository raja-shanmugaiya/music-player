import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '../../_theme';

export function Screen({
  children,
  style,
  padded = true,
  edges = ['top', 'left', 'right'],
  withTabBar = false,
}) {
  const insets = useSafeAreaInsets();
  const baseHorizontalPadding = padded ? layout.screenPadding : 0;

  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = withTabBar
    ? layout.tabBarHeight +
      layout.tabBarBottomOffset +
      layout.miniPlayerHeight +
      spacing.lg
    : edges.includes('bottom')
      ? insets.bottom
      : 0;
  const paddingLeft =
    baseHorizontalPadding + (edges.includes('left') ? insets.left : 0);
  const paddingRight =
    baseHorizontalPadding + (edges.includes('right') ? insets.right : 0);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
