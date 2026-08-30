import { Pressable, StyleSheet } from 'react-native';

import { colors } from '../../_theme';

const toneStyles = {
  cream: {
    backgroundColor: colors.accent.cream,
    iconColor: colors.text.inverse,
  },
  gray: {
    backgroundColor: colors.tertiary[300],
    iconColor: colors.text.inverse,
  },
  white: {
    backgroundColor: colors.text.primary,
    iconColor: colors.text.inverse,
  },
  danger: {
    backgroundColor: colors.accent.dangerSoft,
    iconColor: colors.text.inverse,
  },
  primary: {
    backgroundColor: colors.primary[500],
    iconColor: colors.text.inverse,
  },
};

export function IconButton({
  icon,
  tone = 'cream',
  onPress,
  size = 44,
  disabled = false,
  style,
}) {
  const toneStyle = toneStyles[tone];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: toneStyle.backgroundColor,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {typeof icon === 'function' ? icon(toneStyle.iconColor) : icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
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
