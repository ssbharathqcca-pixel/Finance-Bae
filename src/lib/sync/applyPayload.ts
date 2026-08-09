import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { SyncPayload } from '@/src/types/auth';
import { getDeviceLabel } from '@/src/lib/sync/backup';

/** Build payload from current stores (excludes password hashes). */
export async function buildSyncPayload(): Promise<SyncPayload> {
  const app = useAppStore.getState();
  const auth = useAuthStore.getState();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    deviceId: await getDeviceLabel(),
    userEmail: auth.session?.email || undefined,
    settings: app.settings,
    taxProfile: app.taxProfile,
    expenses: app.expenses,
    budgets: app.budgets,
    deductions: app.deductions,
    evidence: app.evidence,
    pets: app.pets,
    splitGroups: app.splitGroups ?? [],
    debts: app.debts ?? [],
    reminderPrefs: auth.reminderPrefs,
  };
}

/** Merge restored backup into app + reminder prefs (destructive replace of finance data). */
export function applySyncPayload(payload: SyncPayload): void {
  if (payload.version !== 1) {
    throw new Error('Unsupported backup payload version.');
  }
  useAppStore.setState({
    settings: payload.settings,
    taxProfile: payload.taxProfile,
    expenses: payload.expenses ?? [],
    budgets: payload.budgets ?? [],
    deductions: payload.deductions ?? [],
    evidence: (payload.evidence ?? []).map((e) => ({
      ...e,
      attachments: e.attachments ?? [],
    })),
    pets: payload.pets ?? [],
    splitGroups: payload.splitGroups ?? [],
    debts: payload.debts ?? [],
  });
  if (payload.reminderPrefs) {
    useAuthStore.getState().updateReminderPrefs(payload.reminderPrefs);
  }
  if (payload.settings?.displayName) {
    // keep display name aligned
  }
}
