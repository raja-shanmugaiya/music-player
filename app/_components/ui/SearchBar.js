import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, layout, radius, spacing } from '../../_theme';
import { fontFamily, fontSize } from '../../_theme/typography';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  ...props
}) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons
        color={colors.primary[500]}
        name="search"
        size={layout.iconSize.sm}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        selectionColor={colors.primary[500]}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.input,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: colors.text.secondary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    padding: 0,
  },
});
