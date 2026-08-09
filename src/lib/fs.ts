/**
 * FileSystem helpers for Expo SDK 54.
 * Prefer legacy API path when available.
 */
import { Platform } from 'react-native';

type FsLike = {
  documentDirectory: string | null;
  cacheDirectory: string | null;
  EncodingType?: { UTF8: string; Base64: string };
  getInfoAsync: (uri: string, options?: object) => Promise<{ exists: boolean }>;
  makeDirectoryAsync: (uri: string, options?: { intermediates?: boolean }) => Promise<void>;
  copyAsync: (options: { from: string; to: string }) => Promise<void>;
  deleteAsync: (uri: string, options?: { idempotent?: boolean }) => Promise<void>;
  readAsStringAsync: (uri: string, options?: { encoding?: string }) => Promise<string>;
  writeAsStringAsync: (uri: string, contents: string, options?: { encoding?: string }) => Promise<void>;
};

let cached: FsLike | null = null;

export function getFileSystem(): FsLike {
  if (cached) return cached;
  try {
    // SDK 54+
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-file-system/legacy') as FsLike;
    return cached;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-file-system') as FsLike;
    return cached;
  }
}

export async function readUriText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return res.text();
  }
  const FS = getFileSystem();
  try {
    const enc = FS.EncodingType?.UTF8 ?? 'utf8';
    return await FS.readAsStringAsync(uri, { encoding: enc });
  } catch {
    const res = await fetch(uri);
    return res.text();
  }
}
