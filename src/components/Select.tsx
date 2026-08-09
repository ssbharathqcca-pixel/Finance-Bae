import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/src/hooks/useTheme';
import { radius, spacing, typography } from '@/src/theme';

export type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};

type SelectProps<T extends string> = {
  label?: string;
  placeholder?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  searchable?: boolean;
  style?: ViewStyle;
  allowClear?: boolean;
  clearLabel?: string;
  onClear?: () => void;
};

/**
 * Compact dropdown. Modal is only mounted while open so it never
 * leaves an invisible overlay blocking clicks on web.
 */
export function Select<T extends string>({
  label,
  placeholder = 'Select…',
  value,
  options,
  onChange,
  searchable = true,
  style,
  allowClear,
  clearLabel = 'None',
  onClear,
}: SelectProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (v: T) => {
    onChange(v);
    close();
  };

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? (
        <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.bgMuted,
            borderColor: theme.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.body,
            { flex: 1, color: selected ? theme.text : theme.textSecondary },
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8 }}>▼</Text>
      </Pressable>

      {/* Critical: only mount Modal when open — prevents stuck full-screen blockers on web */}
      {open ? (
        <Modal visible animationType="fade" transparent onRequestClose={close}>
          <View style={styles.modalRoot} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              onPress={close}
              style={[styles.backdrop, { backgroundColor: 'rgba(15,23,42,0.45)' }]}
            />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.border,
                },
              ]}
              // stop backdrop from receiving presses inside the sheet
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.sheetHeader}>
                <Text style={[typography.subtitle, { color: theme.text, flex: 1 }]}>
                  {label || 'Choose'}
                </Text>
                <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>Done</Text>
                </Pressable>
              </View>

              {searchable ? (
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Type to filter…"
                  placeholderTextColor={theme.textSecondary}
                  autoCorrect={false}
                  style={[
                    styles.search,
                    {
                      color: theme.text,
                      backgroundColor: theme.bgMuted,
                      borderColor: theme.border,
                    },
                  ]}
                />
              ) : null}

              <FlatList
                data={filtered}
                keyExtractor={(item, index) => `${String(item.value)}-${index}`}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: Platform.OS === 'web' ? 360 : 420 }}
                ListHeaderComponent={
                  allowClear ? (
                    <Pressable
                      onPress={() => {
                        onClear?.();
                        close();
                      }}
                      style={[styles.option, { borderBottomColor: theme.border }]}
                    >
                      <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>
                        {clearLabel}
                      </Text>
                    </Pressable>
                  ) : null
                }
                ListEmptyComponent={
                  <Text style={{ color: theme.textSecondary, textAlign: 'center', padding: 24 }}>
                    No matches
                  </Text>
                }
                renderItem={({ item }) => {
                  const active = item.value === value;
                  return (
                    <Pressable
                      onPress={() => pick(item.value)}
                      style={[
                        styles.option,
                        {
                          borderBottomColor: theme.border,
                          backgroundColor: active ? theme.primarySoft : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: active ? '700' : '500',
                          flex: 1,
                        }}
                      >
                        {item.label}
                      </Text>
                      {active ? (
                        <Text style={{ color: theme.primary, fontWeight: '800' }}>✓</Text>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '80%',
    zIndex: 2,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  search: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    fontSize: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
