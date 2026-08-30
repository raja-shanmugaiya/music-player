import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../_theme';
import { Text } from './Text';

const variants = {
  primary: {
    container: {
      backgroundColor: colors.accent.cream,
    },
    label: {
      color: colors.text.inverse,
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.background.secondary,
    },
    label: {
      color: colors.text.secondary,
    },
  },
  inverted: {
    container: {
      backgroundColor: colors.tertiary[200],
    },
    label: {
      color: colors.text.inverse,
    },
  },
  outlined: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent.cream,
    },
    label: {
      color: colors.text.secondary,
    },
  },
  action: {
    container: {
      backgroundColor: colors.primary[500],
    },
    label: {
      color: colors.text.inverse,
    },
  },
};

export function Button({
  label,
  variant = 'primary',
  icon,
  onPress,
  disabled = false,
  style,
  labelStyle,
}) {
  const variantStyles = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles.container,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      {label ? (
        <Text variant="label" style={[variantStyles.label, labelStyle]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
