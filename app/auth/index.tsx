import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  Chip,
  Input,
  Screen,
  SectionHeader,
} from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { spacing } from '@/src/theme';

type Mode = 'welcome' | 'signin' | 'register';

export default function AuthScreen() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const register = useAuthStore((s) => s.register);
  const signIn = useAuthStore((s) => s.signIn);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [mode, setMode] = useState<Mode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  };

  const finish = (name?: string) => {
    if (name) updateSettings({ displayName: name });
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  };

  const onGuest = () => {
    continueAsGuest(displayName || 'Guest');
    finish(displayName || 'Guest');
  };

  const onRegister = async () => {
    setBusy(true);
    try {
      await register(email, password, displayName);
      finish(displayName || email.split('@')[0]);
    } catch (e) {
      notify('Could not register', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const onSignIn = async () => {
    setBusy(true);
    try {
      await signIn(email, password);
      const name = useAuthStore.getState().session?.displayName;
      finish(name);
    } catch (e) {
      notify('Sign-in failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  if (session && mode === 'welcome') {
    return (
      <Screen>
        <Body bold style={{ fontSize: 22 }}>
          Signed in as {session.displayName}
        </Body>
        <Caption style={{ marginTop: 8 }}>
          Mode: {session.mode === 'guest' ? 'Guest (this device only)' : 'Account'}
          {session.email ? ` · ${session.email}` : ''}
        </Caption>
        <Button
          label="Open account & sync"
          onPress={() => router.push('/account' as any)}
          style={{ marginTop: spacing.xl }}
        />
        <Button label="Back" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>GBP account</Text>
        <Body muted>
          Optional sign-in unlocks encrypted backups and cloud sync opt-in. Guest mode keeps
          everything local — your choice.
        </Body>

        {mode === 'welcome' && (
          <>
            <Card style={{ marginTop: spacing.lg, backgroundColor: theme.primarySoft }}>
              <Body bold>Privacy choices</Body>
              <Caption style={{ marginTop: 8 }}>
                • Guest — data stays on this device only{'\n'}
                • Account — password never leaves device unhashed; backups use your passphrase
                {'\n'}• Cloud push only if you opt in and configure a sync URL
              </Caption>
            </Card>

            <SectionHeader title="Continue" />
            <View style={styles.chips}>
              <Chip label="Create account" active={false} onPress={() => setMode('register')} />
              <Chip label="Sign in" active={false} onPress={() => setMode('signin')} />
            </View>
            <Input
              label="Display name (guest)"
              placeholder="Traveler"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Button label="Continue as guest" variant="secondary" onPress={onGuest} />
            <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
          </>
        )}

        {mode === 'register' && (
          <>
            <SectionHeader title="Create account" />
            <Input label="Display name" value={displayName} onChangeText={setDisplayName} />
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Password (min 8)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Caption style={{ marginBottom: spacing.md }}>
              Password is hashed on-device (never stored in plain text). Create a separate backup
              passphrase when you encrypt sync files.
            </Caption>
            <Button label={busy ? 'Creating…' : 'Create account'} onPress={onRegister} disabled={busy} />
            <Button label="Back" variant="ghost" onPress={() => setMode('welcome')} style={{ marginTop: 8 }} />
          </>
        )}

        {mode === 'signin' && (
          <>
            <SectionHeader title="Sign in" />
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={onSignIn} disabled={busy} />
            <Button label="Back" variant="ghost" onPress={() => setMode('welcome')} style={{ marginTop: 8 }} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
});
