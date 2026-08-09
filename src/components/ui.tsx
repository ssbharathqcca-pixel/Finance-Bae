import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/src/hooks/useTheme';
import { radius, spacing, typography } from '@/src/theme';

/** Safe press: never block on haptics; works on web + native. */
function press(fn?: () => void) {
  return () => {
    try {
      fn?.();
    } catch (e) {
      console.warn('Press handler error', e);
    }
  };
}

export function Screen({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.bg },
        padded && styles.screenPad,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const theme = useTheme();
  return <Text style={[typography.hero, { color: theme.text }, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const theme = useTheme();
  return <Text style={[typography.title, { color: theme.text }, style]}>{children}</Text>;
}

export function Body({
  children,
  muted,
  style,
  bold,
  numberOfLines,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: TextStyle;
  bold?: boolean;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        bold ? typography.bodyBold : typography.body,
        { color: muted ? theme.textSecondary : theme.text },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Caption({
  children,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[typography.caption, { color: theme.textSecondary }, style]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bgElevated,
          borderColor: theme.border,
          shadowColor: theme.cardShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={press(onPress)}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function GadgetCard({
  title,
  subtitle,
  emoji,
  accent,
  background,
  onPress,
  style,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  background: string;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={press(onPress)}
      style={({ pressed }) => [
        styles.gadget,
        {
          backgroundColor: background,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View style={styles.gadgetTop}>
        <View style={[styles.gadgetIcon, { backgroundColor: theme.bgElevated }]}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        <View style={[styles.gadgetDot, { backgroundColor: accent }]} />
      </View>
      <Text
        style={[typography.bodyBold, { color: theme.text, marginTop: 10, fontSize: 14 }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        style={[typography.caption, { color: theme.textSecondary, marginTop: 3, fontSize: 11 }]}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const bg =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.bgMuted
          : 'transparent';
  const color =
    variant === 'primary' || variant === 'danger' ? theme.textInverse : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={press(onPress)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === 'ghost' ? theme.borderStrong : 'transparent',
          borderWidth: variant === 'ghost' ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[typography.bodyBold, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  style,
  ...props
}: TextInputProps & { label?: string; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? (
        <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...props}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.bgMuted,
            borderColor: theme.border,
          },
          props.multiline && { minHeight: 88, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primarySoft : theme.bgMuted,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        style={[
          typography.caption,
          { color: active ? theme.primary : theme.textSecondary, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({
  progress,
  color,
  trackColor,
}: {
  progress: number;
  color?: string;
  trackColor?: string;
}) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor ?? theme.bgMuted }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${pct}%`, backgroundColor: color ?? theme.primary },
        ]}
      />
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[typography.subtitle, { color: theme.text }]}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction}>
          <Text style={[typography.caption, { color: theme.primary, fontWeight: '700' }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HeroBanner({
  title,
  subtitle,
  value,
  footer,
}: {
  title: string;
  subtitle?: string;
  value: string;
  footer?: string;
}) {
  return (
    <LinearGradient
      colors={['#059669', '#0EA5E9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Text style={[typography.micro, { color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }]}>
        {title}
      </Text>
      <Text style={[typography.hero, { color: '#fff', marginTop: 6 }]}>{value}</Text>
      {subtitle ? (
        <Text style={[typography.body, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]}>
          {subtitle}
        </Text>
      ) : null}
      {footer ? (
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: spacing.sm }]}>
          {footer}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}>
      <Text style={[typography.subtitle, { color: theme.text }]}>{title}</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 6, textAlign: 'center' }]}>
        {body}
      </Text>
    </View>
  );
}

/**
 * Always renders children visibly. Optional soft fade on native only.
 * Never starts at opacity 0 (that made the whole UI look “blank” on web).
 */
export function FadeIn({ children }: { children: ReactNode; delay?: number }) {
  return <View style={{ width: '100%' }}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  gadget: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
    height: 120,
    width: '100%',
    justifyContent: 'flex-start',
  },
  gadgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gadgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gadgetDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 12,
    fontSize: 15,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xxl,
    overflow: 'hidden',
  },
  empty: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
  },
});
