import * as DocumentPicker from 'expo-document-picker';

import { readUriText } from '@/src/lib/fs';

/**
 * Local-only CSV pick + read. Never uploads the file.
 * Caller should discard the returned text after sanitizing allowed fields.
 */
export async function pickAndReadCsv(): Promise<{
  text: string;
  fileName: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'text/plain',
      'application/vnd.ms-excel',
      'public.comma-separated-values-text',
      '*/*',
    ],
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const fileName = asset.name || 'import.csv';

  // Reject non-csv-ish names lightly (still allow .txt bank exports)
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith('.pdf') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.heic')
  ) {
    throw new Error('Please choose a CSV or plain-text bank export, not an image/PDF.');
  }

  const text = await readUriText(asset.uri);
  if (!text || !text.trim()) {
    throw new Error('That file appears empty.');
  }

  // Hard size guard — large dumps may include unintended PII; keep imports reviewable
  if (text.length > 2_000_000) {
    throw new Error('File is too large. Export a shorter date range (under ~2MB).');
  }

  return { text, fileName };
}
