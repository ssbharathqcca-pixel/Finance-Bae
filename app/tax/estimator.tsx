import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  Chip,
  Input,
  Screen,
  SectionHeader,
} from '@/src/components/ui';
import {
  caProvinceNames,
  caProvinces,
  filingStatusLabels,
  usStateNames,
  usStates,
} from '@/src/data/labels';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney, formatPercent } from '@/src/lib/format';
import { estimateTax, getCaRegionModel, getUsStateModel } from '@/src/lib/tax/estimators';
import { useAppStore } from '@/src/store/useAppStore';
import { CountryCode, TaxProfile } from '@/src/types';
import { spacing } from '@/src/theme';

type FilingStatus = TaxProfile['filingStatus'];

export default function TaxEstimatorScreen() {
  const theme = useTheme();
  const taxProfile = useAppStore((s) => s.taxProfile);
  const updateTaxProfile = useAppStore((s) => s.updateTaxProfile);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const currency = useAppStore((s) => s.settings.currency);
  const deductionsTotal = useAppStore((s) => s.deductionsTotalForYear());

  const [gross, setGross] = useState(String(taxProfile.annualGrossIncome));
  const [other, setOther] = useState(String(taxProfile.otherIncome));
  const [withholding, setWithholding] = useState(String(taxProfile.estimatedWithholding));
  const [region, setRegion] = useState(taxProfile.provinceOrState);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(taxProfile.filingStatus);
  const [dependents, setDependents] = useState(String(taxProfile.dependents));

  const draft = useMemo(
    () => ({
      ...taxProfile,
      annualGrossIncome: parseFloat(gross) || 0,
      otherIncome: parseFloat(other) || 0,
      estimatedWithholding: parseFloat(withholding) || 0,
      provinceOrState: region.toUpperCase().trim(),
      filingStatus,
      dependents: Math.max(0, Math.floor(parseFloat(dependents) || 0)),
    }),
    [taxProfile, gross, other, withholding, region, filingStatus, dependents]
  );

  const estimate = estimateTax(draft, deductionsTotal);
  const regions = draft.country === 'CA' ? caProvinces : usStates;
  const regionNames = draft.country === 'CA' ? caProvinceNames : usStateNames;

  const regionMeta =
    draft.country === 'CA'
      ? getCaRegionModel(draft.provinceOrState)
      : getUsStateModel(draft.provinceOrState);

  const filingOptions: FilingStatus[] =
    draft.country === 'CA'
      ? ['single', 'married_joint', 'common_law']
      : ['single', 'married_joint', 'married_separate', 'head_of_household'];

  const applyCountry = (country: CountryCode) => {
    const nextRegion = country === 'CA' ? 'ON' : 'CA';
    updateTaxProfile({
      country,
      provinceOrState: nextRegion,
      filingStatus: 'single',
    });
    updateSettings({
      preferredCountry: country,
      currency: country === 'CA' ? 'CAD' : 'USD',
    });
    setRegion(nextRegion);
    setFilingStatus('single');
  };

  const saveProfile = () => {
    updateTaxProfile({
      annualGrossIncome: draft.annualGrossIncome,
      otherIncome: draft.otherIncome,
      estimatedWithholding: draft.estimatedWithholding,
      provinceOrState: draft.provinceOrState,
      filingStatus: draft.filingStatus,
      dependents: draft.dependents,
    });
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Body muted>
          Educational estimates for US states/DC and Canadian provinces. Not tax advice.
        </Body>

        <SectionHeader title="Jurisdiction" />
        <View style={styles.chips}>
          <Chip
            label="United States (IRS)"
            active={taxProfile.country === 'US'}
            onPress={() => applyCountry('US')}
          />
          <Chip
            label="Canada (CRA)"
            active={taxProfile.country === 'CA'}
            onPress={() => applyCountry('CA')}
          />
        </View>

        <SectionHeader title={draft.country === 'CA' ? 'Province / territory' : 'State'} />
        <Caption style={{ marginBottom: 8 }}>
          Selected: {regionMeta.name} ({draft.provinceOrState})
        </Caption>
        <View style={styles.chips}>
          {regions.map((r) => (
            <Chip
              key={r}
              label={r}
              active={region.toUpperCase() === r}
              onPress={() => setRegion(r)}
            />
          ))}
        </View>
        <Caption style={{ marginBottom: spacing.md }}>
          {regionNames[draft.provinceOrState] ?? draft.provinceOrState}
        </Caption>

        <SectionHeader title="Filing profile" />
        <View style={styles.chips}>
          {filingOptions.map((f) => (
            <Chip
              key={f}
              label={filingStatusLabels[f]}
              active={filingStatus === f}
              onPress={() => setFilingStatus(f)}
            />
          ))}
        </View>
        <Input
          label="Dependents (for simplified credits)"
          keyboardType="number-pad"
          value={dependents}
          onChangeText={setDependents}
        />
        <Input
          label="Annual gross income"
          keyboardType="decimal-pad"
          value={gross}
          onChangeText={setGross}
        />
        <Input label="Other income" keyboardType="decimal-pad" value={other} onChangeText={setOther} />
        <Input
          label="Estimated withholding / instalments"
          keyboardType="decimal-pad"
          value={withholding}
          onChangeText={setWithholding}
        />
        <Caption style={{ marginBottom: spacing.md }}>
          Your tracked deductions: {formatMoney(deductionsTotal, currency)}
        </Caption>

        <Button label="Save to profile" onPress={saveProfile} />

        <SectionHeader title="Live estimate" />
        <Card style={{ backgroundColor: theme.gadget.tax.bg }}>
          <Caption>
            {estimate.regionName} · {estimate.filingLabel}
          </Caption>
          <Text style={[styles.big, { color: theme.text }]}>
            {formatMoney(estimate.totalEstimatedTax, currency)}
          </Text>
          <Body style={{ marginTop: spacing.sm }}>
            Effective {formatPercent(estimate.effectiveRate)} · Marginal{' '}
            {formatPercent(estimate.marginalRate)}
          </Body>
          <Body muted style={{ marginTop: spacing.sm }}>
            After withholding: {formatMoney(estimate.estimatedLiabilityAfterWithholding, currency)}
          </Body>
        </Card>

        <SectionHeader title="Breakdown" />
        <Card>
          <Row label="Gross income" value={formatMoney(estimate.grossIncome, currency)} />
          <Row label="Taxable income" value={formatMoney(estimate.taxableIncome, currency)} />
          <Row label="Federal (net)" value={formatMoney(estimate.federalTax, currency)} />
          <Row
            label={draft.country === 'CA' ? 'Provincial (net)' : 'State (net)'}
            value={formatMoney(estimate.regionalTax, currency)}
          />
          <Row label="Credits applied" value={formatMoney(estimate.totalCredits, currency)} />
          <Caption style={{ marginTop: spacing.md }}>{estimate.disclaimer}</Caption>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Caption style={{ flex: 1, marginRight: 8 }}>{label}</Caption>
      <Text style={{ color: theme.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  big: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.25)',
  },
});
