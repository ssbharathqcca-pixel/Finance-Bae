import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  Screen,
  SectionHeader,
} from '@/src/components/ui';
import { Select } from '@/src/components/Select';
import { expenseCategoryLabels, paymentMethodLabels } from '@/src/data/labels';
import {
  analyzeCsv,
  buildSanitizedImport,
  ColumnMapping,
  CSV_PRIVACY_POINTS,
  PRIVACY_SAFE_CSV_TEMPLATE,
  SanitizedImportRow,
} from '@/src/lib/csv/importExpenses';
import { pickAndReadCsv } from '@/src/lib/csv/readLocalCsv';
import { formatMoney } from '@/src/lib/format';
import { ALLOWED_FIELD_HELP } from '@/src/lib/privacy/sanitize';
import { useTheme } from '@/src/hooks/useTheme';
import { useAppStore } from '@/src/store/useAppStore';
import { AllowedImportField } from '@/src/types';
import { radius, spacing } from '@/src/theme';

type Step = 'consent' | 'map' | 'preview' | 'done';

const FIELD_ORDER: AllowedImportField[] = [
  'title',
  'amount',
  'category',
  'paymentMethod',
  'date',
];

const FIELD_LABELS: Record<AllowedImportField, string> = {
  title: 'Expense name',
  amount: 'Amount',
  category: 'Category',
  paymentMethod: 'Payment mode',
  date: 'Date (optional)',
};

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function ImportExpensesScreen() {
  const theme = useTheme();
  const currency = useAppStore((s) => s.settings.currency);
  const addExpensesBulk = useAppStore((s) => s.addExpensesBulk);

  const [step, setStep] = useState<Step>('consent');
  const [consentChecks, setConsentChecks] = useState({
    optional: false,
    localOnly: false,
    fieldsOnly: false,
  });
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  /** Held only in memory until import completes or user cancels. */
  const [csvText, setCsvText] = useState<string | null>(null);
  const [deniedHeaders, setDeniedHeaders] = useState<string[]>([]);
  const [allowedHeaders, setAllowedHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [previewRows, setPreviewRows] = useState<SanitizedImportRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  const allConsented = consentChecks.optional && consentChecks.localOnly && consentChecks.fieldsOnly;

  const previewTotal = useMemo(
    () => previewRows.reduce((sum, r) => sum + r.amount, 0),
    [previewRows]
  );

  const toggleConsent = (key: keyof typeof consentChecks) => {
    setConsentChecks((c) => ({ ...c, [key]: !c[key] }));
  };

  const resetFlow = () => {
    setStep('consent');
    setConsentChecks({ optional: false, localOnly: false, fieldsOnly: false });
    setFileName(null);
    setCsvText(null);
    setDeniedHeaders([]);
    setAllowedHeaders([]);
    setMapping({});
    setPreviewRows([]);
    setSkippedCount(0);
    setImportedCount(0);
  };

  const cancelAndDiscard = () => {
    // Drop CSV from memory immediately
    setCsvText(null);
    router.back();
  };

  const onPickFile = async () => {
    if (!allConsented) {
      notify('Consent required', 'Confirm all privacy checkboxes before choosing a file.');
      return;
    }
    setBusy(true);
    try {
      const picked = await pickAndReadCsv();
      if (!picked) {
        setBusy(false);
        return;
      }
      const analysis = analyzeCsv(picked.text);
      if (!analysis.headers.length || !analysis.rawRowCount) {
        notify('Empty file', 'No data rows found. Export a CSV with a header row.');
        setBusy(false);
        return;
      }
      setFileName(picked.fileName);
      setCsvText(picked.text);
      setDeniedHeaders(analysis.deniedHeaders);
      setAllowedHeaders(analysis.allowedHeaders);
      setMapping(analysis.suggestedMapping);
      setStep('map');
    } catch (e) {
      notify('Could not read file', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const onBuildPreview = () => {
    if (!csvText) return;
    try {
      const result = buildSanitizedImport(csvText, mapping);
      if (!result.accepted.length) {
        notify(
          'Nothing to import',
          result.skipped.length
            ? `All ${result.skipped.length} rows were skipped (check name/amount mapping).`
            : 'No valid rows after privacy filtering.'
        );
        return;
      }
      setPreviewRows(result.accepted);
      setSkippedCount(result.skipped.length);
      setStep('preview');
    } catch (e) {
      notify('Mapping error', e instanceof Error ? e.message : 'Invalid mapping');
    }
  };

  const onConfirmImport = () => {
    if (!previewRows.length) return;
    const count = addExpensesBulk(
      previewRows.map((row) => ({
        title: row.title,
        amount: row.amount,
        category: row.category,
        paymentMethod: row.paymentMethod,
        date: row.date,
        source: 'csv_import' as const,
      }))
    );
    // Discard original CSV from memory
    setCsvText(null);
    setImportedCount(count);
    setStep('done');
  };

  const copyTemplateHint = () => {
    notify(
      'Privacy-safe template',
      'Use columns: name, amount, category, payment_method, date\n\n' +
        'Only those fields are kept. Never include account or card numbers.\n\n' +
        PRIVACY_SAFE_CSV_TEMPLATE
    );
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'consent' && (
          <>
            <Card style={{ backgroundColor: theme.warningSoft, borderColor: theme.border }}>
              <Body bold>Optional · privacy-first import</Body>
              <Body muted style={{ marginTop: 8 }}>
                CSV import is 100% optional. You can keep entering every expense manually. GBP never
                logs into your bank and never uploads your file.
              </Body>
            </Card>

            <SectionHeader title="What we keep" />
            <Body muted style={{ marginBottom: spacing.sm }}>
              After you consent, we only retain these sanitized fields:
            </Body>
            {(Object.keys(ALLOWED_FIELD_HELP) as AllowedImportField[]).map((k) => (
              <View key={k} style={styles.bulletRow}>
                <Text style={{ color: theme.primary }}>•</Text>
                <Body style={{ flex: 1, marginLeft: 8 }}>
                  <Body bold>{FIELD_LABELS[k]}</Body> — {ALLOWED_FIELD_HELP[k]}
                </Body>
              </View>
            ))}

            <SectionHeader title="What we block" />
            <Body muted>
              Account numbers, routing/transit numbers, card PANs, balances, addresses, emails,
              phones, SSN/SIN, and similar identifiers are blocked from column mapping and redacted
              from expense names.
            </Body>

            <SectionHeader title="Your consent" />
            <ConsentRow
              checked={consentChecks.optional}
              label="I understand this is optional — I can enter expenses manually instead."
              onPress={() => toggleConsent('optional')}
            />
            <ConsentRow
              checked={consentChecks.localOnly}
              label="I understand the file is processed only on this device and is not uploaded to GBP servers."
              onPress={() => toggleConsent('localOnly')}
            />
            <ConsentRow
              checked={consentChecks.fieldsOnly}
              label="I consent to import only expense name, category, amount, payment mode, and optional date — not bank account data."
              onPress={() => toggleConsent('fieldsOnly')}
            />

            <Caption style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
              {CSV_PRIVACY_POINTS[4]} This feature is designed to support privacy expectations under
              laws such as PIPEDA (Canada) and US state privacy laws by minimizing data (purpose
              limitation) and keeping processing local. This is not legal advice.
            </Caption>

            <Button
              label={busy ? 'Opening…' : 'I consent — choose CSV on this device'}
              onPress={onPickFile}
              disabled={!allConsented || busy}
            />
            <Button
              label="Continue with manual entry only"
              variant="secondary"
              onPress={() => router.replace('/expense/add')}
              style={{ marginTop: spacing.sm }}
            />
            <Button
              label="View privacy-safe template"
              variant="ghost"
              onPress={copyTemplateHint}
              style={{ marginTop: spacing.sm }}
            />
            <Button label="Cancel" variant="ghost" onPress={cancelAndDiscard} style={{ marginTop: 4 }} />
          </>
        )}

        {step === 'map' && (
          <>
            <Body bold>Map columns · {fileName}</Body>
            <Caption style={{ marginTop: 4, marginBottom: spacing.md }}>
              Only map allowed fields. Blocked bank columns cannot be selected.
            </Caption>

            {deniedHeaders.length > 0 ? (
              <Card style={{ marginBottom: spacing.md, backgroundColor: theme.dangerSoft }}>
                <Body bold>Blocked for privacy</Body>
                <Caption style={{ marginTop: 6 }}>{deniedHeaders.join(' · ')}</Caption>
              </Card>
            ) : null}

            {FIELD_ORDER.map((field) => (
              <Select
                key={field}
                label={`${FIELD_LABELS[field]}${field === 'title' || field === 'amount' ? ' *' : ''}`}
                value={(mapping[field] as string) || ''}
                options={[
                  { value: '', label: '— not mapped —' },
                  ...allowedHeaders.map((h) => ({ value: h, label: h })),
                ]}
                onChange={(h) =>
                  setMapping((m) => ({ ...m, [field]: h ? h : null }))
                }
                searchable
              />
            ))}

            <Button label="Preview sanitized rows" onPress={onBuildPreview} />
            <Button
              label="Choose a different file"
              variant="secondary"
              onPress={onPickFile}
              style={{ marginTop: spacing.sm }}
            />
            <Button
              label="Cancel & discard file"
              variant="ghost"
              onPress={cancelAndDiscard}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}

        {step === 'preview' && (
          <>
            <Body bold>Review before saving</Body>
            <Caption style={{ marginTop: 4 }}>
              {previewRows.length} expenses · {formatMoney(previewTotal, currency)} total
              {skippedCount ? ` · ${skippedCount} rows skipped` : ''}
            </Caption>
            <Caption style={{ marginBottom: spacing.md }}>
              Names are sanitized. Original CSV is still only in memory until you confirm or cancel.
            </Caption>

            {previewRows.slice(0, 40).map((row, i) => (
              <View
                key={`${row.title}-${i}`}
                style={[styles.previewRow, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}
              >
                <View style={{ flex: 1 }}>
                  <Body bold numberOfLines={1}>
                    {row.title}
                  </Body>
                  <Caption>
                    {expenseCategoryLabels[row.category]} · {paymentMethodLabels[row.paymentMethod]} ·{' '}
                    {row.date}
                  </Caption>
                </View>
                <Text style={{ fontWeight: '700', color: theme.text }}>
                  {formatMoney(row.amount, currency)}
                </Text>
              </View>
            ))}
            {previewRows.length > 40 ? (
              <Caption style={{ marginBottom: spacing.md }}>
                Showing first 40 of {previewRows.length}. All will import if you confirm.
              </Caption>
            ) : null}

            <Button
              label={`Import ${previewRows.length} sanitized expenses`}
              onPress={onConfirmImport}
            />
            <Button
              label="Back to mapping"
              variant="secondary"
              onPress={() => setStep('map')}
              style={{ marginTop: spacing.sm }}
            />
            <Button
              label="Cancel & discard file"
              variant="ghost"
              onPress={cancelAndDiscard}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}

        {step === 'done' && (
          <>
            <Card style={{ backgroundColor: theme.primarySoft }}>
              <Body bold>Import complete</Body>
              <Body style={{ marginTop: 8 }}>
                Saved {importedCount} expense{importedCount === 1 ? '' : 's'} on this device. The
                original CSV was discarded from memory.
              </Body>
            </Card>
            <Button
              label="View expenses"
              onPress={() => router.replace('/(tabs)/expenses')}
              style={{ marginTop: spacing.lg }}
            />
            <Button
              label="Import another file"
              variant="secondary"
              onPress={resetFlow}
              style={{ marginTop: spacing.sm }}
            />
            <Button label="Done" variant="ghost" onPress={() => router.back()} style={{ marginTop: 4 }} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function ConsentRow({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.consent,
        {
          borderColor: checked ? theme.primary : theme.border,
          backgroundColor: checked ? theme.primarySoft : theme.bgElevated,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: theme.primary,
            backgroundColor: checked ? theme.primary : 'transparent',
          },
        ]}
      >
        {checked ? <Text style={{ color: theme.textInverse, fontSize: 12, fontWeight: '800' }}>✓</Text> : null}
      </View>
      <Body style={{ flex: 1 }}>{label}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
});
