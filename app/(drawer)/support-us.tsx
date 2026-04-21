import React, { useMemo } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppThemeColors } from '../../src/constants/theme';
import { useAppTheme } from '../../src/context/ThemeContext';

const APP_STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL ?? '';
const PLAY_STORE_URL = process.env.EXPO_PUBLIC_PLAY_STORE_URL ?? '';
const DONATION_URL = process.env.EXPO_PUBLIC_DONATION_URL ?? '';

async function openExternalUrl(url: string, fallbackMessage: string) {
  if (!url) {
    Alert.alert('Coming Soon', fallbackMessage);
    return;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Invalid URL', 'This link is not configured correctly.');
    return;
  }

  await Linking.openURL(url);
}

export default function SupportUsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Support</Text>
        <Text style={styles.title}>Support Us</Text>
        <Text style={styles.subtitle}>
          Help sustain future development by rating the app and supporting funding initiatives.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rate This App</Text>
        <Text style={styles.cardText}>
          Ratings help improve visibility and bring more learners into the platform.
        </Text>
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() =>
              openExternalUrl(
                PLAY_STORE_URL,
                'Set EXPO_PUBLIC_PLAY_STORE_URL to enable Play Store ratings.'
              )
            }
          >
            <Text style={styles.actionBtnText}>Rate on Play Store</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() =>
              openExternalUrl(APP_STORE_URL, 'Set EXPO_PUBLIC_APP_STORE_URL to enable App Store ratings.')
            }
          >
            <Text style={styles.actionBtnText}>Rate on App Store</Text>
          </Pressable>
        </View>
        <Text style={styles.metaText}>Current platform: {Platform.OS}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Donate</Text>
        <Text style={styles.cardText}>Contributions can support new features, content, and app reliability.</Text>
        <Pressable
          style={styles.donateBtn}
          onPress={() =>
            openExternalUrl(DONATION_URL, 'Set EXPO_PUBLIC_DONATION_URL to enable donation checkout.')
          }
        >
          <Text style={styles.donateBtnText}>Donate to Support Future Development</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: colors.screenBackground,
      flexGrow: 1,
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.heroEyebrow,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.onStrong,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.heroSubtle,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    cardText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 12,
    },
    buttonRow: {
      gap: 10,
      marginBottom: 10,
    },
    actionBtn: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    actionBtnText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    donateBtn: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    donateBtnText: {
      color: colors.onStrong,
      fontWeight: '700',
      fontSize: 14,
      textAlign: 'center',
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
  });
}
