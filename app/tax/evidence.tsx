import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Select } from '@/src/components/Select';
import { Body, Button, Caption, EmptyState, Input, Screen } from '@/src/components/ui';
import { authorityLabels } from '@/src/data/labels';
import { useTheme } from '@/src/hooks/useTheme';
import {
  deleteAttachmentFile,
  formatBytes,
  openAttachment,
  pickDocuments,
  pickFromCamera,
  pickFromGallery,
} from '@/src/lib/evidenceAttachments';
import { formatShortDate } from '@/src/lib/format';
import { useAppStore } from '@/src/store/useAppStore';
import { EvidenceAttachment, NoticeAuthority } from '@/src/types';
import { radius, spacing } from '@/src/theme';

const authorities = Object.keys(authorityLabels) as NoticeAuthority[];

function showError(message: string) {
  if (Platform.OS === 'web') {
    // Alert works on web in RN but can be silent in some browsers
    window.alert(message);
    return;
  }
  Alert.alert('Could not attach file', message);
}

export default function EvidenceScreen() {
  const theme = useTheme();
  const evidence = useAppStore((s) => s.evidence);
  const addEvidence = useAppStore((s) => s.addEvidence);
  const removeEvidence = useAppStore((s) => s.removeEvidence);
  const preferred = useAppStore((s) => s.settings.preferredCountry);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [noticeRef, setNoticeRef] = useState('');
  const [attachmentNote, setAttachmentNote] = useState('');
  const [authority, setAuthority] = useState<NoticeAuthority>(preferred === 'CA' ? 'CRA' : 'IRS');
  const [pending, setPending] = useState<EvidenceAttachment[]>([]);
  const [busy, setBusy] = useState(false);

  const withBusy = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const onCamera = () =>
    withBusy(async () => {
      try {
        const file = await pickFromCamera();
        if (file) setPending((p) => [...p, file]);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Camera capture failed.');
      }
    });

  const onGallery = () =>
    withBusy(async () => {
      try {
        const files = await pickFromGallery();
        if (files.length) setPending((p) => [...p, ...files]);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Gallery pick failed.');
      }
    });

  const onDocuments = () =>
    withBusy(async () => {
      try {
        const files = await pickDocuments();
        if (files.length) setPending((p) => [...p, ...files]);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Document pick failed.');
      }
    });

  const removePending = (id: string) => {
    const target = pending.find((a) => a.id === id);
    if (target) void deleteAttachmentFile(target);
    setPending((p) => p.filter((a) => a.id !== id));
  };

  const save = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Title and description are required.');
      return;
    }
    addEvidence({
      title: title.trim(),
      description: description.trim(),
      authority,
      noticeRef: noticeRef.trim() || undefined,
      taxYear: new Date().getFullYear(),
      tags: [authority.toLowerCase(), ...(pending.length ? ['has-attachments'] : [])],
      attachmentNote: attachmentNote.trim() || undefined,
      attachments: pending,
    });
    setTitle('');
    setDescription('');
    setNoticeRef('');
    setAttachmentNote('');
    setPending([]);
  };

  const confirmRemove = (id: string, itemTitle: string) => {
    const run = () => removeEvidence(id);
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove “${itemTitle}” and its files?`)) run();
      return;
    }
    Alert.alert('Remove evidence', `Delete “${itemTitle}” and attached files from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={evidence}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Body muted>
              Capture photos of notices and upload PDFs or images. Files are stored on this device
              for IRS / CRA response prep.
            </Body>

            <Input
              label="Title"
              placeholder="CP2000 wage mismatch packet"
              value={title}
              onChangeText={setTitle}
            />
            <Input
              label="Description"
              placeholder="What this evidence supports..."
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Input
              label="Notice reference #"
              placeholder="Notice ID / letter code"
              value={noticeRef}
              onChangeText={setNoticeRef}
            />
            <Input
              label="Extra note (optional)"
              placeholder="Originals in filing cabinet, accountant has copy..."
              value={attachmentNote}
              onChangeText={setAttachmentNote}
            />

            <Select
              label="Authority"
              value={authority}
              options={authorities.map((a) => ({
                value: a,
                label: authorityLabels[a],
              }))}
              onChange={setAuthority}
              searchable
            />

            <Caption style={{ marginBottom: 8 }}>Attachments</Caption>
            <View style={styles.attachRow}>
              <Button
                label="📷 Camera"
                variant="secondary"
                onPress={onCamera}
                disabled={busy}
                style={styles.attachBtn}
              />
              <Button
                label="🖼 Gallery"
                variant="secondary"
                onPress={onGallery}
                disabled={busy}
                style={styles.attachBtn}
              />
            </View>
            <Button
              label="📄 PDF / file"
              variant="secondary"
              onPress={onDocuments}
              disabled={busy}
              style={{ marginBottom: spacing.sm }}
            />
            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={theme.primary} />
                <Caption style={{ marginLeft: 8 }}>Preparing attachment…</Caption>
              </View>
            ) : null}

            {pending.length > 0 ? (
              <View style={styles.pendingWrap}>
                {pending.map((att) => (
                  <AttachmentChip
                    key={att.id}
                    attachment={att}
                    onRemove={() => removePending(att.id)}
                    onOpen={() => openAttachment(att).catch(() => showError('Unable to open file.'))}
                  />
                ))}
              </View>
            ) : (
              <Caption style={{ marginBottom: spacing.md }}>
                No files yet — use Camera for notice photos or PDF/file for scans.
              </Caption>
            )}

            <Button
              label={
                pending.length
                  ? `Save evidence + ${pending.length} file${pending.length === 1 ? '' : 's'}`
                  : 'Save evidence item'
              }
              onPress={save}
              disabled={busy}
              style={{ marginBottom: spacing.lg }}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Vault is empty"
            body="Add a notice item and attach photos or PDFs to back your response."
          />
        }
        renderItem={({ item }) => {
          const attachments = item.attachments ?? [];
          return (
            <View
              style={[styles.card, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
            >
              <Body bold>{item.title}</Body>
              <Caption>
                {authorityLabels[item.authority]}
                {item.noticeRef ? ` · Ref ${item.noticeRef}` : ''} · {formatShortDate(item.createdAt)}
              </Caption>
              <Body style={{ marginTop: 8 }}>{item.description}</Body>
              {item.attachmentNote ? (
                <Caption style={{ marginTop: 6 }}>📝 {item.attachmentNote}</Caption>
              ) : null}

              {attachments.length > 0 ? (
                <View style={styles.gallery}>
                  {attachments.map((att) => (
                    <AttachmentPreview
                      key={att.id}
                      attachment={att}
                      onOpen={() =>
                        openAttachment(att).catch(() => showError('Unable to open attachment.'))
                      }
                    />
                  ))}
                </View>
              ) : (
                <Caption style={{ marginTop: spacing.sm }}>No files attached</Caption>
              )}

              <Button
                label="Remove"
                variant="ghost"
                onPress={() => confirmRemove(item.id, item.title)}
                style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
              />
            </View>
          );
        }}
      />
    </Screen>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
  onOpen,
}: {
  attachment: EvidenceAttachment;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const icon = attachment.kind === 'pdf' ? '📄' : attachment.kind === 'image' ? '🖼' : '📎';
  return (
    <View style={[styles.chipFile, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
      <Pressable onPress={onOpen} style={{ flex: 1 }}>
        <Body bold numberOfLines={1}>
          {icon} {attachment.name}
        </Body>
        <Caption>
          {attachment.kind.toUpperCase()}
          {attachment.sizeBytes ? ` · ${formatBytes(attachment.sizeBytes)}` : ''}
        </Caption>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.chipX}>
        <Text style={{ color: theme.danger, fontWeight: '700' }}>×</Text>
      </Pressable>
    </View>
  );
}

function AttachmentPreview({
  attachment,
  onOpen,
}: {
  attachment: EvidenceAttachment;
  onOpen: () => void;
}) {
  const theme = useTheme();
  if (attachment.kind === 'image') {
    return (
      <Pressable onPress={onOpen} style={[styles.thumbWrap, { borderColor: theme.border }]}>
        <Image source={{ uri: attachment.uri }} style={styles.thumb} contentFit="cover" />
        <Caption style={styles.thumbLabel} numberOfLines={1}>
          {attachment.name}
        </Caption>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onOpen}
      style={[
        styles.fileCard,
        { backgroundColor: theme.gadget.evidence.bg, borderColor: theme.border },
      ]}
    >
      <Text style={{ fontSize: 22 }}>{attachment.kind === 'pdf' ? '📄' : '📎'}</Text>
      <Body bold numberOfLines={2} style={{ marginTop: 6, fontSize: 12 }}>
        {attachment.name}
      </Body>
      <Caption>{formatBytes(attachment.sizeBytes) || 'Open file'}</Caption>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  attachRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  attachBtn: {
    flexGrow: 1,
    minWidth: '30%',
    paddingVertical: 12,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pendingWrap: {
    gap: 8,
    marginBottom: spacing.md,
  },
  chipFile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  chipX: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.md,
  },
  thumbWrap: {
    width: 100,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: 88,
    backgroundColor: '#11182722',
  },
  thumbLabel: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  fileCard: {
    width: 110,
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
  },
});
