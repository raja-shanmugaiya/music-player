import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '../../_theme';
import { fontFamily, fontSize } from '../../_theme/typography';
import { Text } from '../ui';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <MaterialCommunityIcons
        color={colors.primary[500]}
        name="crown"
        size={28}
      />
      <Text style={styles.title}>KING MUSIC</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.primary,
    fontFamily: fontFamily.headline,
    fontSize: fontSize.xl,
    letterSpacing: 1.5,
  },
  spacer: {
    width: 28,
  },
});
