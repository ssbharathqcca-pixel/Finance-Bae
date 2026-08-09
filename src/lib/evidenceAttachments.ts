import { Platform, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { getFileSystem } from '@/src/lib/fs';
import { EvidenceAttachment, EvidenceAttachmentKind } from '@/src/types';
import { uid } from '@/src/lib/format';

const VAULT_DIR = 'evidence-vault';

function guessKind(mimeType?: string | null, name?: string | null): EvidenceAttachmentKind {
  const mime = (mimeType ?? '').toLowerCase();
  const lowerName = (name ?? '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/i.test(lowerName)) {
    return 'image';
  }
  if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  return 'file';
}

function extensionFor(uri: string, mimeType?: string | null, name?: string | null): string {
  if (name && name.includes('.')) {
    return name.slice(name.lastIndexOf('.'));
  }
  const pathExt = uri.split('?')[0].match(/\.[a-zA-Z0-9]+$/)?.[0];
  if (pathExt) return pathExt;
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType?.startsWith('image/')) return '.jpg';
  return '';
}

async function ensureVaultDir(): Promise<string | null> {
  const FileSystem = getFileSystem();
  const root = FileSystem.documentDirectory;
  if (!root) return null;
  const dir = `${root}${VAULT_DIR}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Copy a picked file into app document storage so it survives cache clears.
 * On web (or if copy fails), falls back to the original URI.
 */
export async function persistPickedFile(params: {
  sourceUri: string;
  name?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}): Promise<EvidenceAttachment> {
  const { sourceUri, name, mimeType, sizeBytes } = params;
  const kind = guessKind(mimeType, name);
  const safeName = (name || `attachment${extensionFor(sourceUri, mimeType, name)}`).replace(
    /[^\w.\-() ]+/g,
    '_'
  );
  const id = uid('att');
  const createdAt = new Date().toISOString();

  let uri = sourceUri;

  try {
    const dir = await ensureVaultDir();
    if (dir && Platform.OS !== 'web') {
      const FileSystem = getFileSystem();
      const dest = `${dir}${id}_${safeName}`;
      await FileSystem.copyAsync({ from: sourceUri, to: dest });
      uri = dest;
    }
  } catch {
    // Keep original URI (common on web / content providers)
    uri = sourceUri;
  }

  return {
    id,
    kind,
    name: safeName,
    uri,
    mimeType: mimeType ?? undefined,
    sizeBytes: sizeBytes ?? undefined,
    createdAt,
  };
}

export async function deleteAttachmentFile(attachment: EvidenceAttachment): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!attachment.uri.startsWith('file://') && !attachment.uri.includes(VAULT_DIR)) return;
  try {
    const FileSystem = getFileSystem();
    const info = await FileSystem.getInfoAsync(attachment.uri);
    if (info.exists) {
      await FileSystem.deleteAsync(attachment.uri, { idempotent: true });
    }
  } catch {
    // ignore cleanup failures
  }
}

export async function deleteAttachments(attachments: EvidenceAttachment[] | undefined): Promise<void> {
  if (!attachments?.length) return;
  await Promise.all(attachments.map((a) => deleteAttachmentFile(a)));
}

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const req = await ImagePicker.requestCameraPermissionsAsync();
  return req.granted;
}

async function ensureLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return req.granted;
}

export async function pickFromCamera(): Promise<EvidenceAttachment | null> {
  const ok = await ensureCameraPermission();
  if (!ok) {
    throw new Error('Camera permission is required to capture notice evidence.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return persistPickedFile({
    sourceUri: asset.uri,
    name: asset.fileName ?? `camera_${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    sizeBytes: asset.fileSize,
  });
}

export async function pickFromGallery(): Promise<EvidenceAttachment[]> {
  const ok = await ensureLibraryPermission();
  if (!ok) {
    throw new Error('Photo library permission is required to attach images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsMultipleSelection: true,
    selectionLimit: 8,
    exif: false,
  });

  if (result.canceled || !result.assets?.length) return [];

  const saved: EvidenceAttachment[] = [];
  for (const asset of result.assets) {
    saved.push(
      await persistPickedFile({
        sourceUri: asset.uri,
        name: asset.fileName ?? `gallery_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        sizeBytes: asset.fileSize,
      })
    );
  }
  return saved;
}

export async function pickDocuments(): Promise<EvidenceAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return [];

  const saved: EvidenceAttachment[] = [];
  for (const asset of result.assets) {
    saved.push(
      await persistPickedFile({
        sourceUri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
      })
    );
  }
  return saved;
}

export async function openAttachment(attachment: EvidenceAttachment): Promise<void> {
  const can = await Linking.canOpenURL(attachment.uri);
  if (can) {
    await Linking.openURL(attachment.uri);
    return;
  }
  // Fallback: still try — some file:// URIs report false on canOpenURL
  await Linking.openURL(attachment.uri);
}

export function formatBytes(bytes?: number): string {
  if (bytes == null || !Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
