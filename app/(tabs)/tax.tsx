import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Body,
  Button,
  Caption,
  Card,
  FadeIn,
  HeroBanner,
  SectionHeader,
} from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney, formatPercent } from '@/src/lib/format';
import { estimateTax } from '@/src/lib/tax/estimators';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function TaxScreen() {
  const theme = useTheme();
  const taxProfile = useAppStore((s) => s.taxProfile);
  const currency = useAppStore((s) => s.settings.currency);
  const deductions = useAppStore((s) => s.deductions);
  const evidence = useAppStore((s) => s.evidence);
  const deductionsTotal = useAppStore((s) => s.deductionsTotalForYear());
  const estimate = estimateTax(taxProfile, deductionsTotal);

  const authority = taxProfile.country === 'CA' ? 'CRA' : 'IRS';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Caption>{authority} readiness</Caption>
          <Text style={[styles.title, { color: theme.text }]}>Tax center</Text>
          <Body muted>
            Annual estimated liability · deductions · notice evidence for {taxProfile.country}
          </Body>
        </FadeIn>

        <FadeIn delay={60}>
          <View style={{ marginTop: spacing.lg }}>
            <HeroBanner
              title={`${taxProfile.taxYear} estimated liability`}
              value={formatMoney(estimate.totalEstimatedTax, currency)}
              subtitle={`Effective ${formatPercent(estimate.effectiveRate)} · Marginal ${formatPercent(estimate.marginalRate)}`}
              footer={
                estimate.estimatedLiabilityAfterWithholding >= 0
                  ? `~${formatMoney(estimate.estimatedLiabilityAfterWithholding, currency)} still due after withholding`
                  : `~${formatMoney(Math.abs(estimate.estimatedLiabilityAfterWithholding), currency)} estimated refund direction`
              }
            />
          </View>
        </FadeIn>

        <FadeIn delay={100}>
          <SectionHeader title="Breakdown" />
          <Card>
            <Row
              label="Region"
              value={`${estimate.regionName} (${estimate.regionCode})`}
            />
            <Row label="Filing" value={estimate.filingLabel} />
            <Row label="Gross income" value={formatMoney(estimate.grossIncome, currency)} />
            <Row label="Taxable income" value={formatMoney(estimate.taxableIncome, currency)} />
            <Row label="Federal (net)" value={formatMoney(estimate.federalTax, currency)} />
            <Row
              label={
                taxProfile.country === 'CA'
                  ? `${estimate.regionName} (net)`
                  : `${estimate.regionName} (net)`
              }
              value={formatMoney(estimate.regionalTax, currency)}
            />
            <Row label="Credits applied" value={formatMoney(estimate.totalCredits, currency)} />
            <Row label="Deductions tracked" value={formatMoney(deductionsTotal, currency)} />
            <Caption style={{ marginTop: spacing.md }}>{estimate.disclaimer}</Caption>
          </Card>
        </FadeIn>

        <FadeIn delay={140}>
          <SectionHeader title="Workspaces" />
          <View style={styles.actions}>
            <Button label="Open estimator" onPress={() => router.push('/tax/estimator')} />
            <Button
              label={`Deductions (${deductions.length})`}
              variant="secondary"
              onPress={() => router.push('/tax/deductions')}
            />
            <Button
              label={`Evidence vault (${evidence.length})`}
              variant="secondary"
              onPress={() => router.push('/tax/evidence')}
            />
            <Button
              label="Tax installment reminders"
              variant="secondary"
              onPress={() => router.push('/account' as any)}
            />
          </View>
        </FadeIn>

        <FadeIn delay={180}>
          <Card style={{ marginTop: spacing.lg, marginBottom: spacing.xxl }}>
            <Body bold>Collecting evidence for notices</Body>
            <Body muted style={{ marginTop: 6 }}>
              Photograph notices with the camera, attach gallery images, or upload PDFs. Store
              authority (IRS/CRA), reference numbers, and files on-device for quick response prep.
            </Body>
          </Card>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Caption>{label}</Caption>
      <Text style={{ color: theme.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.25)',
  },
  actions: {
    gap: spacing.sm,
  },
});
