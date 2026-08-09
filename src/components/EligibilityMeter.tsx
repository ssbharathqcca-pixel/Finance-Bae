import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { LikelihoodBand } from '@/src/lib/eligibility/types';
import { useTheme } from '@/src/hooks/useTheme';

const bandColor: Record<LikelihoodBand, string> = {
  strong: '#059669',
  fair: '#0EA5E9',
  stretch: '#F59E0B',
  unlikely: '#F97316',
};

const bandLabel: Record<LikelihoodBand, string> = {
  strong: 'Stronger odds',
  fair: 'Fair odds',
  stretch: 'Stretch',
  unlikely: 'Unlikely now',
};

export function EligibilityMeter({
  score,
  band,
  size = 120,
}: {
  score: number;
  band: LikelihoodBand;
  size?: number;
}) {
  const theme = useTheme();
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = bandColor[band];

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.bgMuted}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={[styles.score, { color: theme.text }]}>{Math.round(score)}</Text>
        <Text style={[styles.band, { color }]}>{bandLabel[band]}</Text>
      </View>
    </View>
  );
}

export function StatusPill({ status }: { status: 'good' | 'ok' | 'watch' | 'risk' }) {
  const map = {
    good: { bg: '#D1FAE5', fg: '#047857', label: 'Looks good' },
    ok: { bg: '#E0F2FE', fg: '#0369A1', label: 'Okay' },
    watch: { bg: '#FEF3C7', fg: '#B45309', label: 'Watch' },
    risk: { bg: '#FFEDD5', fg: '#C2410C', label: 'Risk' },
  } as const;
  const s = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={{ color: s.fg, fontSize: 11, fontWeight: '700' }}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  band: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  pill: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
