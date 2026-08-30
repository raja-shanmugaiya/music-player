import { StyleSheet, View } from 'react-native';

import { colors, layout, radius } from '../../_theme';

export function Card({ children, style, padded = true }) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  padded: {
    padding: layout.cardPadding,
  },
});
