import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/src/hooks/useTheme';
import { chartColors } from '@/src/theme';
import { spacing } from '@/src/theme';

export type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

export function PieChart({
  data,
  size = 200,
  innerRatio = 0.55,
  centerLabel,
  centerSub,
}: {
  data: ChartDatum[];
  size?: number;
  innerRatio?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const theme = useTheme();
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const inner = r * innerRatio;

  let angle = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const sweep = (d.value / total) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const color = d.color || chartColors.categories[i % chartColors.categories.length];
      // Full circle special case
      if (sweep >= 359.9) {
        return (
          <G key={d.label + i}>
            <Circle cx={cx} cy={cy} r={r} fill={color} />
            <Circle cx={cx} cy={cy} r={inner} fill={theme.bgElevated} />
          </G>
        );
      }
      const outer = arcPath(cx, cy, r, start, end);
      const innerArc = arcPath(cx, cy, inner, end, start);
      const p0 = polar(cx, cy, r, start);
      const p1 = polar(cx, cy, r, end);
      const p2 = polar(cx, cy, inner, end);
      const p3 = polar(cx, cy, inner, start);
      const large = sweep > 180 ? 1 : 0;
      const path = [
        `M ${p0.x} ${p0.y}`,
        `A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`,
        `L ${p2.x} ${p2.y}`,
        `A ${inner} ${inner} 0 ${large} 0 ${p3.x} ${p3.y}`,
        'Z',
      ].join(' ');
      return <Path key={d.label + i} d={path || outer + innerArc} fill={color} />;
    });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {slices}
        {centerLabel ? (
          <SvgText
            x={cx}
            y={cy - 4}
            fill={theme.text}
            fontSize="14"
            fontWeight="700"
            textAnchor="middle"
          >
            {centerLabel}
          </SvgText>
        ) : null}
        {centerSub ? (
          <SvgText x={cx} y={cy + 14} fill={theme.textSecondary} fontSize="11" textAnchor="middle">
            {centerSub}
          </SvgText>
        ) : null}
      </Svg>
      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={d.label} style={styles.legendRow}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    d.color || chartColors.categories[i % chartColors.categories.length],
                },
              ]}
            />
            <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
              {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function BarChart({
  data,
  height = 180,
  formatValue,
}: {
  data: ChartDatum[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const theme = useTheme();
  const { width: winW } = useWindowDimensions();
  const width = Math.min(winW - 48, 400);
  const max = Math.max(...data.map((d) => d.value), 1);
  const pad = 28;
  const chartH = height - 36;
  const barW = Math.max(16, (width - pad * 2) / Math.max(data.length, 1) - 10);

  return (
    <View>
      <Svg width={width} height={height}>
        <Line
          x1={pad}
          y1={chartH}
          x2={width - 8}
          y2={chartH}
          stroke={theme.borderStrong}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const h = (d.value / max) * (chartH - 8);
          const x = pad + i * ((width - pad * 2) / data.length) + 4;
          const y = chartH - h;
          const color = d.color || chartColors.categories[i % chartColors.categories.length];
          return (
            <G key={d.label + i}>
              <Rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={6} fill={color} />
              <SvgText
                x={x + barW / 2}
                y={height - 8}
                fill={theme.textSecondary}
                fontSize="10"
                textAnchor="middle"
              >
                {d.label.slice(0, 6)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      {formatValue ? (
        <View style={styles.legend}>
          {data.map((d, i) => (
            <View key={d.label} style={styles.legendRow}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      d.color || chartColors.categories[i % chartColors.categories.length],
                  },
                ]}
              />
              <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }}>{d.label}</Text>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                {formatValue(d.value)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function LineChart({
  series,
  height = 180,
  formatValue,
}: {
  series: { name: string; color: string; points: { label: string; value: number }[] }[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const theme = useTheme();
  const { width: winW } = useWindowDimensions();
  const width = Math.min(winW - 48, 400);
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const allVals = series.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(...allVals, 1);
  const min = Math.min(0, ...allVals);
  const span = max - min || 1;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const n = Math.max(labels.length - 1, 1);

  const toXY = (i: number, v: number) => {
    const x = padL + (i / n) * chartW;
    const y = padT + chartH - ((v - min) / span) * chartH;
    return { x, y };
  };

  return (
    <View>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((t) => {
          const y = padT + chartH * (1 - t);
          return (
            <Line
              key={t}
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke={theme.border}
              strokeWidth={1}
            />
          );
        })}
        {series.map((s) => {
          const pts = s.points.map((p, i) => toXY(i, p.value));
          const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <G key={s.name}>
              <Polyline
                points={poly}
                fill="none"
                stroke={s.color}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={4} fill={s.color} />
              ))}
            </G>
          );
        })}
        {labels.map((lab, i) => {
          const { x } = toXY(i, 0);
          return (
            <SvgText
              key={lab + i}
              x={x}
              y={height - 6}
              fill={theme.textSecondary}
              fontSize="10"
              textAnchor="middle"
            >
              {lab}
            </SvgText>
          );
        })}
      </Svg>
      <View style={[styles.legend, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {series.map((s) => (
          <View key={s.name} style={[styles.legendRow, { width: '48%' }]}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>{s.name}</Text>
            {formatValue && s.points.length ? (
              <Text style={{ color: theme.textSecondary, fontSize: 11, marginLeft: 6 }}>
                last {formatValue(s.points[s.points.length - 1].value)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ChartModeChips({
  mode,
  onChange,
}: {
  mode: 'pie' | 'bar' | 'line';
  onChange: (m: 'pie' | 'bar' | 'line') => void;
}) {
  const theme = useTheme();
  const items: { id: 'pie' | 'bar' | 'line'; label: string }[] = [
    { id: 'pie', label: '🥧 Pie' },
    { id: 'bar', label: '📊 Bars' },
    { id: 'line', label: '📈 Trend' },
  ];
  return (
    <View style={styles.modeRow}>
      {items.map((it) => {
        const active = mode === it.id;
        return (
          <View
            key={it.id}
            style={[
              styles.modeChip,
              {
                backgroundColor: active ? theme.primary : theme.bgMuted,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              onPress={() => onChange(it.id)}
              style={{
                color: active ? theme.textInverse : theme.text,
                fontWeight: '700',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {it.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { marginTop: spacing.md, width: '100%', gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 99 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
});
