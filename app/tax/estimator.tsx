import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Select } from '@/src/components/Select';
import {
  Body,
  Button,
  Caption,
  Card,
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
  const [country, setCountry] = useState<CountryCode>(taxProfile.country);

  const draft = useMemo(
    () => ({
      ...taxProfile,
      country,
      annualGrossIncome: parseFloat(gross) || 0,
      otherIncome: parseFloat(other) || 0,
      estimatedWithholding: parseFloat(withholding) || 0,
      provinceOrState: region.toUpperCase().trim(),
      filingStatus,
      dependents: Math.max(0, Math.floor(parseFloat(dependents) || 0)),
    }),
    [taxProfile, country, gross, other, withholding, region, filingStatus, dependents]
  );

  const estimate = estimateTax(draft, deductionsTotal);
  const regions = country === 'CA' ? caProvinces : usStates;
  const regionNames = country === 'CA' ? caProvinceNames : usStateNames;

  const regionMeta =
    country === 'CA' ? getCaRegionModel(draft.provinceOrState) : getUsStateModel(draft.provinceOrState);

  const filingOptions: FilingStatus[] =
    country === 'CA'
      ? ['single', 'married_joint', 'common_law']
      : ['single', 'married_joint', 'married_separate', 'head_of_household'];

  const onCountry = (c: CountryCode) => {
    const nextRegion = c === 'CA' ? 'ON' : 'CA';
    setCountry(c);
    setRegion(nextRegion);
    setFilingStatus('single');
    updateTaxProfile({ country: c, provinceOrState: nextRegion, filingStatus: 'single' });
    updateSettings({
      preferredCountry: c,
      currency: c === 'CA' ? 'CAD' : 'USD',
    });
  };

  const saveProfile = () => {
    updateTaxProfile({
      country,
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
        <Caption>
          Educational estimates only — not tax advice.
        </Caption>

        <Select
          label="Country"
          value={country}
          options={[
            { value: 'US', label: 'United States (IRS)' },
            { value: 'CA', label: 'Canada (CRA)' },
          ]}
          onChange={onCountry}
          searchable={false}
        />
        <Select
          label={country === 'CA' ? 'Province / territory' : 'State'}
          value={region.toUpperCase()}
          options={regions.map((r) => ({
            value: r,
            label: `${r} — ${regionNames[r] ?? r}`,
          }))}
          onChange={setRegion}
          searchable
        />
        <Caption style={{ marginBottom: spacing.sm, marginTop: -4 }}>
          {regionMeta.name}
          {'kind' in regionMeta ? ` · ${regionMeta.kind}` : ''}
          {'note' in regionMeta && regionMeta.note ? ` — ${regionMeta.note}` : ''}
        </Caption>

        <Select
          label="Filing status"
          value={filingStatus}
          options={filingOptions.map((f) => ({ value: f, label: filingStatusLabels[f] }))}
          onChange={setFilingStatus}
          searchable={false}
        />
        <Input
          label="Dependents"
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
          label="Withholding / instalments"
          keyboardType="decimal-pad"
          value={withholding}
          onChangeText={setWithholding}
        />
        <Caption style={{ marginBottom: spacing.md }}>
          Tracked deductions: {formatMoney(deductionsTotal, currency)}
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
          <Body style={{ marginTop: spacing.sm, fontSize: 13 }}>
            Effective {formatPercent(estimate.effectiveRate)} · Marginal{' '}
            {formatPercent(estimate.marginalRate)}
          </Body>
          <Caption style={{ marginTop: 6 }}>
            After withholding: {formatMoney(estimate.estimatedLiabilityAfterWithholding, currency)}
          </Caption>
        </Card>

        <SectionHeader title="Breakdown" />
        <Card>
          <Row label="Gross" value={formatMoney(estimate.grossIncome, currency)} />
          <Row label="Taxable" value={formatMoney(estimate.taxableIncome, currency)} />
          <Row label="Federal (net)" value={formatMoney(estimate.federalTax, currency)} />
          <Row
            label={country === 'CA' ? 'Provincial (net)' : 'State (net)'}
            value={formatMoney(estimate.regionalTax, currency)}
          />
          <Row label="Credits" value={formatMoney(estimate.totalCredits, currency)} />
        </Card>

        {estimate.creditLines.length > 0 ? (
          <>
            <SectionHeader title="Credits" />
            <Card>
              {estimate.creditLines.map((c) => (
                <Row key={c.label} label={c.label} value={formatMoney(c.amount, currency)} />
              ))}
            </Card>
          </>
        ) : null}

        <Caption style={{ marginTop: spacing.lg }}>{estimate.disclaimer}</Caption>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Caption style={{ flex: 1, marginRight: 8 }}>{label}</Caption>
      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  big: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.25)',
  },
});
