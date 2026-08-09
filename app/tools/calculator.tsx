import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { Caption, Screen } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { spacing } from '@/src/theme';

function safeEval(expr: string): string {
  // Very small calculator: digits, + - * / . % and parentheses
  if (!/^[\d+\-*/().%\s]+$/.test(expr)) return 'Error';
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr.replace(/%/g, '/100')})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) return 'Error';
    return String(Number(result.toPrecision(12)));
  } catch {
    return 'Error';
  }
}

const keys = [
  ['C', '⌫', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '=', '='],
];

export default function CalculatorScreen() {
  const theme = useTheme();
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');

  const tap = (key: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    if (key === 'C') {
      setDisplay('0');
      setExpr('');
      return;
    }
    if (key === '⌫') {
      const next = expr.slice(0, -1);
      setExpr(next);
      setDisplay(next || '0');
      return;
    }
    if (key === '=') {
      const result = safeEval(expr || display);
      setDisplay(result);
      setExpr(result === 'Error' ? '' : result);
      return;
    }
    const next = expr === '0' && key !== '.' ? key : expr + key;
    setExpr(next);
    setDisplay(next);
  };

  return (
    <Screen>
      <Caption>Swift multi-gadget calculator</Caption>
      <View style={[styles.display, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
        <Text style={[styles.displayText, { color: theme.text }]} numberOfLines={2}>
          {display}
        </Text>
      </View>
      <View style={styles.pad}>
        {keys.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => {
              if (ri === 4 && ki === 3) return <View key={`${ri}-${ki}`} style={styles.keySlot} />;
              const isOp = ['/', '*', '-', '+', '='].includes(key);
              const isFunc = ['C', '⌫', '%'].includes(key);
              return (
                <Pressable
                  key={`${key}-${ki}`}
                  onPress={() => tap(key)}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: isOp
                        ? theme.primary
                        : isFunc
                          ? theme.bgMuted
                          : theme.bgElevated,
                      borderColor: theme.border,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                    key === '0' && ri === 4 && ki === 0 ? { flex: 2.08 } : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.keyLabel,
                      { color: isOp ? theme.textInverse : theme.text },
                    ]}
                  >
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  display: {
    marginTop: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.xl,
    minHeight: 110,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  displayText: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  pad: {
    marginTop: spacing.lg,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySlot: { flex: 1 },
  keyLabel: {
    fontSize: 22,
    fontWeight: '600',
  },
});
