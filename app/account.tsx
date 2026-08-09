import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  Input,
  Screen,
  SectionHeader,
} from '@/src/components/ui';
import { Select } from '@/src/components/Select';
import { useTheme } from '@/src/hooks/useTheme';
import {
  formatInstallmentList,
  scheduleTaxReminders,
  upcomingInstallments,
} from '@/src/lib/reminders/taxInstallments';
import { applySyncPayload, buildSyncPayload } from '@/src/lib/sync/applyPayload';
import {
  decryptBackup,
  encryptPayload,
  isRemoteSyncConfigured,
  pickBackupFile,
  pullRemoteBackup,
  pushRemoteBackup,
  saveBackupLocally,
} from '@/src/lib/sync/backup';
import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { spacing } from '@/src/theme';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export default function AccountScreen() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const cloudSyncOptIn = useAuthStore((s) => s.cloudSyncOptIn);
  const setCloudSyncOptIn = useAuthStore((s) => s.setCloudSyncOptIn);
  const lastSyncAt = useAuthStore((s) => s.lastSyncAt);
  const lastSyncMessage = useAuthStore((s) => s.lastSyncMessage);
  const setLastSync = useAuthStore((s) => s.setLastSync);
  const signOut = useAuthStore((s) => s.signOut);
  const reminderPrefs = useAuthStore((s) => s.reminderPrefs);
  const updateReminderPrefs = useAuthStore((s) => s.updateReminderPrefs);
  const updateTaxProfile = useAppStore((s) => s.updateTaxProfile);
  const preferredCountry = useAppStore((s) => s.settings.preferredCountry);

  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  const remoteReady = isRemoteSyncConfigured();

  if (!session) {
    return (
      <Screen>
        <Body>Sign in or continue as guest to manage account features.</Body>
        <Button
          label="Go to auth"
          onPress={() => router.push('/auth' as any)}
          style={{ marginTop: spacing.lg }}
        />
      </Screen>
    );
  }

  const runExport = async (alsoRemote: boolean) => {
    if (passphrase.length < 8) {
      notify('Passphrase required', 'Use at least 8 characters to encrypt your backup.');
      return;
    }
    setBusy(true);
    try {
      const payload = await buildSyncPayload();
      const backup = await encryptPayload(payload, passphrase);
      const saved = await saveBackupLocally(backup);
      let message = saved.path
        ? `Encrypted backup saved on device:\n${saved.path}`
        : 'Encrypted backup ready (downloaded on web).';

      if (alsoRemote) {
        if (!cloudSyncOptIn) {
          message += '\n\nCloud push skipped — enable cloud sync opt-in first.';
        } else if (session.mode !== 'account' || !sessionToken) {
          message += '\n\nCloud push requires a signed-in account.';
        } else {
          const remote = await pushRemoteBackup(backup, sessionToken);
          message += `\n\n${remote.message}`;
        }
      }

      setLastSync(new Date().toISOString(), message);
      notify('Backup complete', message);
    } catch (e) {
      notify('Backup failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (passphrase.length < 8) {
      notify('Passphrase required', 'Enter the passphrase used when the backup was created.');
      return;
    }
    const confirmMsg =
      'Restoring a backup replaces expenses, budgets, tax profile, splits, and pets on this device. Continue?';
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMsg)) return;
    } else {
      // use Alert with promise pattern
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert('Restore backup', confirmMsg, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Restore', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;
    }

    setBusy(true);
    try {
      const file = await pickBackupFile();
      if (!file) {
        setBusy(false);
        return;
      }
      const payload = await decryptBackup(file, passphrase);
      applySyncPayload(payload);
      setLastSync(new Date().toISOString(), 'Restored from encrypted local backup.');
      notify('Restored', 'Your data was decrypted and applied on this device.');
    } catch (e) {
      notify('Restore failed', e instanceof Error ? e.message : 'Wrong passphrase or corrupt file.');
    } finally {
      setBusy(false);
    }
  };

  const runRemotePull = async () => {
    if (!cloudSyncOptIn || !sessionToken || session.mode !== 'account') {
      notify('Not available', 'Sign in, opt in to cloud sync, and set EXPO_PUBLIC_SYNC_URL.');
      return;
    }
    if (passphrase.length < 8) {
      notify('Passphrase required', 'Enter your backup passphrase to decrypt the remote blob.');
      return;
    }
    setBusy(true);
    try {
      const pulled = await pullRemoteBackup(sessionToken);
      if (!pulled.ok) {
        notify('Pull failed', pulled.message);
        return;
      }
      const payload = await decryptBackup(pulled.backup, passphrase);
      applySyncPayload(payload);
      setLastSync(new Date().toISOString(), 'Restored from remote encrypted backup.');
      notify('Restored', 'Remote encrypted backup applied.');
    } catch (e) {
      notify('Pull failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const applyReminders = async () => {
    setBusy(true);
    try {
      // Keep tax profile country aligned with reminder country
      if (reminderPrefs.country !== preferredCountry) {
        updateTaxProfile({
          country: reminderPrefs.country,
          provinceOrState: reminderPrefs.country === 'CA' ? 'ON' : preferredCountry === 'US' ? 'CA' : 'CA',
        });
      }
      const result = await scheduleTaxReminders({
        ...reminderPrefs,
        lastScheduledAt: new Date().toISOString(),
      });
      updateReminderPrefs({ lastScheduledAt: new Date().toISOString() });
      setReminderMsg(result.message);
      notify('Tax reminders', result.message);
    } catch (e) {
      notify('Reminders failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const upcoming = upcomingInstallments(reminderPrefs.country).slice(0, 4);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={{ backgroundColor: theme.gadget.tax.bg }}>
          <Body bold>{session.displayName}</Body>
          <Caption style={{ marginTop: 4 }}>
            {session.mode === 'guest' ? 'Guest session · this device only' : session.email}
          </Caption>
          {lastSyncAt ? (
            <Caption style={{ marginTop: 8 }}>
              Last sync: {new Date(lastSyncAt).toLocaleString()}
            </Caption>
          ) : null}
          {lastSyncMessage ? (
            <Caption style={{ marginTop: 4 }} numberOfLines={4}>
              {lastSyncMessage}
            </Caption>
          ) : null}
        </Card>

        {/* ——— 1. Auth & cloud sync ——— */}
        <SectionHeader title="1 · Auth & encrypted sync" />
        <Body muted style={{ marginBottom: spacing.sm }}>
          Backups are always encrypted with your passphrase before leaving memory. Cloud upload is
          optional and only sends the encrypted blob if you opt in and configure a sync server.
        </Body>

        <Select
          label="Cloud sync opt-in"
          value={cloudSyncOptIn ? 'on' : 'off'}
          options={[
            { value: 'off', label: 'Off — local only' },
            { value: 'on', label: 'On — allow encrypted remote push' },
          ]}
          onChange={(v) => setCloudSyncOptIn(v === 'on')}
          searchable={false}
        />
        <Caption style={{ marginBottom: spacing.sm }}>
          Remote:{' '}
          {remoteReady
            ? 'configured via EXPO_PUBLIC_SYNC_URL'
            : 'not set — local export still works'}
        </Caption>

        <Input
          label="Backup passphrase (min 8) — not your login password"
          secureTextEntry
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Encryption passphrase"
        />

        <Button
          label={busy ? 'Working…' : 'Export encrypted backup'}
          onPress={() => runExport(false)}
          disabled={busy}
        />
        <Button
          label="Export + push to cloud (if opted in)"
          variant="secondary"
          onPress={() => runExport(true)}
          disabled={busy}
          style={{ marginTop: spacing.sm }}
        />
        <Button
          label="Restore from file"
          variant="secondary"
          onPress={runImport}
          disabled={busy}
          style={{ marginTop: spacing.sm }}
        />
        <Button
          label="Pull latest from cloud"
          variant="ghost"
          onPress={runRemotePull}
          disabled={busy}
          style={{ marginTop: spacing.sm }}
        />

        {/* ——— 2. Tax installment reminders ——— */}
        <SectionHeader title="2 · Tax installment reminders" />
        <Body muted style={{ marginBottom: spacing.sm }}>
          Local push notifications for IRS estimated-tax quarters or CRA instalment dates. No SMS
          or email leaves your device.
        </Body>

        <Select
          label="Reminders"
          value={reminderPrefs.enabled ? 'on' : 'off'}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'on', label: 'On' },
          ]}
          onChange={(v) => updateReminderPrefs({ enabled: v === 'on' })}
          searchable={false}
        />
        <Select
          label="Country schedule"
          value={reminderPrefs.country}
          options={[
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' },
          ]}
          onChange={(country) => updateReminderPrefs({ country: country as 'US' | 'CA' })}
          searchable={false}
        />
        <Select
          label="Days before due date"
          value={String(reminderPrefs.daysBefore)}
          options={[
            { value: '3', label: '3 days' },
            { value: '7', label: '7 days' },
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
          ]}
          onChange={(d) => updateReminderPrefs({ daysBefore: parseInt(d, 10) })}
          searchable={false}
        />
        <Select
          label="Notification hour"
          value={String(reminderPrefs.hour)}
          options={[
            { value: '8', label: '8:00' },
            { value: '9', label: '9:00' },
            { value: '12', label: '12:00' },
            { value: '18', label: '18:00' },
          ]}
          onChange={(h) => updateReminderPrefs({ hour: parseInt(h, 10) })}
          searchable={false}
        />

        <Card style={{ marginBottom: spacing.md }}>
          <Body bold>Upcoming {reminderPrefs.country} dates</Body>
          {upcoming.map((d) => (
            <Caption key={d.id} style={{ marginTop: 6 }}>
              • {d.dueDate} — {d.label}
            </Caption>
          ))}
          {!upcoming.length ? <Caption style={{ marginTop: 6 }}>No upcoming dates.</Caption> : null}
        </Card>

        <Button
          label={busy ? 'Scheduling…' : 'Save & schedule reminders'}
          onPress={applyReminders}
          disabled={busy}
        />
        {reminderMsg ? <Caption style={{ marginTop: spacing.sm }}>{reminderMsg}</Caption> : null}
        <Caption style={{ marginTop: spacing.sm }}>
          Calendar reference:{'\n'}
          {formatInstallmentList(reminderPrefs.country)}
        </Caption>

        <SectionHeader title="Session" />
        {session.mode === 'guest' ? (
          <Button
            label="Upgrade to account"
            variant="secondary"
            onPress={() => router.push('/auth' as any)}
          />
        ) : (
          <Button
            label="Sign out"
            variant="ghost"
            onPress={async () => {
              await signOut();
              router.replace('/auth' as any);
            }}
          />
        )}
        <Button label="Done" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
});
