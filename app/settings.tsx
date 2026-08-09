import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Body, Button, Caption, Chip, Input, Screen, SectionHeader } from '@/src/components/ui';
import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { CountryCode } from '@/src/types';
import { spacing } from '@/src/theme';

export default function SettingsScreen() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateTaxProfile = useAppStore((s) => s.updateTaxProfile);
  const session = useAuthStore((s) => s.session);
  const reminderPrefs = useAuthStore((s) => s.reminderPrefs);
  const cloudSyncOptIn = useAuthStore((s) => s.cloudSyncOptIn);

  const setCountry = (country: CountryCode) => {
    updateSettings({
      preferredCountry: country,
      currency: country === 'CA' ? 'CAD' : 'USD',
    });
    updateTaxProfile({
      country,
      provinceOrState: country === 'CA' ? 'ON' : 'CA',
    });
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Caption>Personalize GBP for your North American finances.</Caption>

        <SectionHeader title="Profile" />
        <Input
          label="Display name"
          value={settings.displayName}
          onChangeText={(displayName) => updateSettings({ displayName })}
        />

        <SectionHeader title="Account" />
        <Caption>
          {session
            ? `${session.displayName} (${session.mode}) · Cloud opt-in: ${cloudSyncOptIn ? 'ON' : 'OFF'}`
            : 'Not signed in — data stays on this device.'}
        </Caption>
        <Button
          label={session ? 'Account & reminders' : 'Sign in'}
          onPress={() => router.push(session ? ('/account' as any) : ('/auth' as any))}
          style={{ marginTop: spacing.sm }}
        />

        <SectionHeader title="Cashflow" />
        <Input
          label={`Monthly take-home (${settings.currency})`}
          keyboardType="decimal-pad"
          value={String(settings.monthlyIncome ?? '')}
          onChangeText={(t) => {
            const n = parseFloat(t.replace(',', '.'));
            updateSettings({ monthlyIncome: Number.isFinite(n) ? n : undefined });
          }}
          placeholder="e.g. 5200"
        />
        <Input
          label={`Savings balance (${settings.currency})`}
          keyboardType="decimal-pad"
          value={String(settings.savingsBalance ?? '')}
          onChangeText={(t) => {
            const n = parseFloat(t.replace(',', '.'));
            updateSettings({ savingsBalance: Number.isFinite(n) ? n : 0 });
          }}
          placeholder="e.g. 12500"
        />

        <SectionHeader title="Region & look" />
        <Caption style={{ marginBottom: 6 }}>Country & currency</Caption>
        <View style={styles.chips}>
          <Chip
            label="United States · USD"
            active={settings.preferredCountry === 'US'}
            onPress={() => setCountry('US')}
          />
          <Chip
            label="Canada · CAD"
            active={settings.preferredCountry === 'CA'}
            onPress={() => setCountry('CA')}
          />
        </View>
        <Caption style={{ marginBottom: 6 }}>Appearance</Caption>
        <View style={styles.chips}>
          {(
            [
              { value: 'system' as const, label: 'System' },
              { value: 'light' as const, label: 'Light' },
              { value: 'dark' as const, label: 'Dark' },
            ] as const
          ).map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={settings.darkMode === o.value}
              onPress={() => updateSettings({ darkMode: o.value })}
            />
          ))}
        </View>

        <SectionHeader title="Tax reminders" />
        <Caption>
          {reminderPrefs.enabled ? 'ON' : 'OFF'} · {reminderPrefs.country} ·{' '}
          {reminderPrefs.daysBefore} days before · {reminderPrefs.hour}:00
        </Caption>
        <View style={styles.row}>
          <Button
            label="Dashboard"
            variant="secondary"
            onPress={() => router.push('/(tabs)/dashboard' as any)}
            style={styles.half}
          />
          <Button
            label="Reminders"
            variant="secondary"
            onPress={() => router.push('/account' as any)}
            style={styles.half}
          />
        </View>

        <SectionHeader title="Privacy" />
        <Caption>
          Manual expenses always work. CSV import is optional and local-only. No bank login.
        </Caption>
        <Button
          label="CSV import"
          variant="secondary"
          onPress={() => router.push('/expense/import' as any)}
          style={{ marginTop: spacing.sm }}
        />

        <Button label="Done" onPress={() => router.back()} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  half: { flex: 1 },
});
