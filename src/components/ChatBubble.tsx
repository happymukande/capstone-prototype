import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface ChatBubbleProps {
  message: string;
  sender: 'user' | 'bot';
}

export function ChatBubble({ message, sender }: ChatBubbleProps) {
  const { colors } = useAppTheme();
  const isUser = sender === 'user';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.botRow]}>
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.avatarText, { color: colors.primaryStrong }]}>AI</Text>
        </View>
      ) : null}
      <View
        testID={isUser ? 'chat-user-bubble' : 'chat-bot-bubble'}
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.primary : colors.surface,
            borderColor: isUser ? colors.primary : colors.border,
          },
        ]}
      >
        <Text style={[styles.message, { color: isUser ? colors.onPrimary : colors.textPrimary }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
  },
});
