/**
 * Tax installment calendars + local notifications (Expo SDK 54 / Expo Go).
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { TaxReminderPrefs } from '@/src/types/auth';

export type InstallmentDate = {
  id: string;
  label: string;
  dueDate: string;
  country: 'US' | 'CA';
};

export function usInstallmentDates(year: number): InstallmentDate[] {
  return [
    { id: `us-${year}-q1`, label: `US Q1 estimated tax (${year})`, dueDate: `${year}-04-15`, country: 'US' },
    { id: `us-${year}-q2`, label: `US Q2 estimated tax (${year})`, dueDate: `${year}-06-15`, country: 'US' },
    { id: `us-${year}-q3`, label: `US Q3 estimated tax (${year})`, dueDate: `${year}-09-15`, country: 'US' },
    { id: `us-${year}-q4`, label: `US Q4 estimated tax (${year})`, dueDate: `${year + 1}-01-15`, country: 'US' },
  ];
}

export function caInstallmentDates(year: number): InstallmentDate[] {
  return [
    { id: `ca-${year}-q1`, label: `CRA instalment March (${year})`, dueDate: `${year}-03-15`, country: 'CA' },
    { id: `ca-${year}-q2`, label: `CRA instalment June (${year})`, dueDate: `${year}-06-15`, country: 'CA' },
    { id: `ca-${year}-q3`, label: `CRA instalment September (${year})`, dueDate: `${year}-09-15`, country: 'CA' },
    { id: `ca-${year}-q4`, label: `CRA instalment December (${year})`, dueDate: `${year}-12-15`, country: 'CA' },
  ];
}

export function upcomingInstallments(country: 'US' | 'CA', from = new Date()): InstallmentDate[] {
  const y = from.getFullYear();
  const list =
    country === 'CA'
      ? [...caInstallmentDates(y), ...caInstallmentDates(y + 1)]
      : [...usInstallmentDates(y), ...usInstallmentDates(y + 1)];
  const today = from.toISOString().slice(0, 10);
  return list.filter((d) => d.dueDate >= today).slice(0, 8);
}

export function reminderFireDate(dueDate: string, daysBefore: number, hour: number): Date | null {
  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const fire = new Date(due);
  fire.setDate(fire.getDate() - Math.max(0, daysBefore));
  fire.setHours(Math.min(23, Math.max(0, hour)), 0, 0, 0);
  if (fire.getTime() <= Date.now()) return null;
  return fire;
}

let handlerConfigured = false;

function ensureHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }) as any,
    });
    handlerConfigured = true;
  } catch {
    // ignore
  }
}

function permissionGranted(status: { granted?: boolean; status?: string }) {
  return status?.granted === true || status?.status === 'granted';
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }
  try {
    ensureHandler();
    const current = await Notifications.getPermissionsAsync();
    if (permissionGranted(current as any)) return true;
    const req = await Notifications.requestPermissionsAsync();
    return permissionGranted(req as any);
  } catch {
    return false;
  }
}

const TAX_REMINDER_PREFIX = 'gbp-tax-';

export async function cancelTaxReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(TAX_REMINDER_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // ignore
  }
}

export async function scheduleTaxReminders(
  prefs: TaxReminderPrefs
): Promise<{ scheduled: number; skipped: number; message: string }> {
  if (!prefs.enabled) {
    await cancelTaxReminders();
    return { scheduled: 0, skipped: 0, message: 'Reminders disabled.' };
  }

  const ok = await ensureNotificationPermission();
  if (!ok) {
    return { scheduled: 0, skipped: 0, message: 'Notification permission denied or unavailable.' };
  }

  const dates = upcomingInstallments(prefs.country);
  if (Platform.OS === 'web') {
    return {
      scheduled: 0,
      skipped: dates.length,
      message: `Web: ${dates.length} upcoming dates tracked in-app.`,
    };
  }

  await cancelTaxReminders();
  let scheduled = 0;
  let skipped = 0;

  try {
    for (const d of dates) {
      const fire = reminderFireDate(d.dueDate, prefs.daysBefore, prefs.hour);
      if (!fire) {
        skipped++;
        continue;
      }
      await Notifications.scheduleNotificationAsync({
        identifier: `${TAX_REMINDER_PREFIX}${d.id}`,
        content: {
          title: 'GBP tax installment reminder',
          body: `${d.label} is due ${d.dueDate}. Review Tax center.`,
          data: { type: 'tax_installment', dueDate: d.dueDate, country: d.country },
          sound: true,
        },
        trigger: { date: fire } as Notifications.NotificationTriggerInput,
      });
      scheduled++;
    }
  } catch (e) {
    return {
      scheduled: 0,
      skipped: dates.length,
      message: e instanceof Error ? e.message : 'Could not schedule notifications.',
    };
  }

  return {
    scheduled,
    skipped,
    message: `Scheduled ${scheduled} reminder(s) for ${prefs.country}.`,
  };
}

export function formatInstallmentList(country: 'US' | 'CA'): string {
  return upcomingInstallments(country)
    .slice(0, 4)
    .map((d) => `• ${d.dueDate} — ${d.label}`)
    .join('\n');
}
