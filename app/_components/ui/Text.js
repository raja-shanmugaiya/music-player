import { Text as RNText, StyleSheet } from 'react-native';

import { colors, typography } from '../../_theme';

const variants = {
  headline: {
    ...typography.headline,
    color: colors.text.primary,
  },
  headlineSmall: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },
  bodySmall: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
  caption: {
    ...typography.caption,
    color: colors.text.muted,
  },
  muted: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },
};

export function Text({ variant = 'body', style, ...props }) {
  return <RNText style={[variants[variant], style]} {...props} />;
}

export const textStyles = StyleSheet.create(variants);
