import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { decryptJson, encryptJson } from '@/src/lib/auth/crypto';
import { getFileSystem, readUriText } from '@/src/lib/fs';
import { EncryptedBackup, SyncPayload } from '@/src/types/auth';

const BACKUP_DIR = 'gbp-backups';

function syncUrl(): string | null {
  const extra = Constants.expoConfig?.extra as { syncUrl?: string } | undefined;
  const fromExtra = extra?.syncUrl?.trim();
  const fromEnv = process.env.EXPO_PUBLIC_SYNC_URL?.trim();
  return fromEnv || fromExtra || null;
}

export function isRemoteSyncConfigured(): boolean {
  return !!syncUrl();
}

export async function getDeviceLabel(): Promise<string> {
  const name = Device.deviceName || Device.modelName || 'device';
  return `${Platform.OS}-${name}`.slice(0, 64);
}

export async function encryptPayload(
  payload: SyncPayload,
  passphrase: string
): Promise<EncryptedBackup> {
  const { salt, ciphertext } = await encryptJson(payload, passphrase);
  return {
    v: 1,
    alg: 'GBP-XOR-SHA256-v1',
    salt,
    ciphertext,
    createdAt: new Date().toISOString(),
    label: payload.userEmail || 'gbp-backup',
  };
}

export async function decryptBackup(
  backup: EncryptedBackup,
  passphrase: string
): Promise<SyncPayload> {
  if (backup.v !== 1) throw new Error('Unsupported backup version.');
  return decryptJson<SyncPayload>(backup.ciphertext, backup.salt, passphrase);
}

async function ensureBackupDir(): Promise<string | null> {
  const FileSystem = getFileSystem();
  const root = FileSystem.documentDirectory;
  if (!root) return null;
  const dir = `${root}${BACKUP_DIR}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/** Write encrypted backup to app documents (native) or return JSON string (web). */
export async function saveBackupLocally(
  backup: EncryptedBackup
): Promise<{ path?: string; json: string }> {
  const json = JSON.stringify(backup, null, 2);
  if (Platform.OS === 'web') {
    // Trigger browser download
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gbp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore download failures
    }
    return { json };
  }
  const dir = await ensureBackupDir();
  if (!dir) return { json };
  const FileSystem = getFileSystem();
  const path = `${dir}backup-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, json, { encoding: 'utf8' });
  return { path, json };
}

/** Pick a previously exported .json backup from the device. */
export async function pickBackupFile(): Promise<EncryptedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const uri = result.assets[0].uri;
  const text = await readUriText(uri);
  const parsed = JSON.parse(text) as EncryptedBackup;
  if (!parsed?.ciphertext || !parsed?.salt) {
    throw new Error('That file is not a GBP encrypted backup.');
  }
  return parsed;
}

/**
 * Optional remote sync — only if EXPO_PUBLIC_SYNC_URL is set.
 * POST { backup } with Authorization: Bearer <sessionToken>
 * Server must accept encrypted blobs only (client already encrypted).
 */
export async function pushRemoteBackup(
  backup: EncryptedBackup,
  sessionToken: string
): Promise<{ ok: boolean; message: string }> {
  const url = syncUrl();
  if (!url) {
    return {
      ok: false,
      message: 'Remote sync is not configured. Set EXPO_PUBLIC_SYNC_URL to enable cloud push.',
    };
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/v1/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ backup }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, message: `Remote sync failed (${res.status}): ${body.slice(0, 120)}` };
    }
    return { ok: true, message: 'Encrypted backup uploaded to your sync endpoint.' };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Network error during remote sync.',
    };
  }
}

export async function pullRemoteBackup(
  sessionToken: string
): Promise<{ ok: true; backup: EncryptedBackup } | { ok: false; message: string }> {
  const url = syncUrl();
  if (!url) {
    return {
      ok: false,
      message: 'Remote sync is not configured. Set EXPO_PUBLIC_SYNC_URL to enable cloud pull.',
    };
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/v1/backups/latest`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) {
      return { ok: false, message: `Pull failed (${res.status}).` };
    }
    const data = (await res.json()) as { backup?: EncryptedBackup };
    if (!data.backup?.ciphertext) {
      return { ok: false, message: 'No backup found on remote.' };
    }
    return { ok: true, backup: data.backup };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Network error during pull.',
    };
  }
}
