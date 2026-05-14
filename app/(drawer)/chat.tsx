import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble } from '../../src/components/ChatBubble';
import { useAppTheme } from '../../src/context/ThemeContext';
import { isChatServiceConfigured, sendChatMessage } from '../../src/services/chatApi';
import { loadChatHistory, replaceLocalChatHistory, saveChatMessage } from '../../src/services/chatHistory';
import { useAuth } from '../../context/AuthProvider';

type ChatMessage = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
};

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  text: 'Hi! Ask me anything about your lessons, study plan, or a topic you want explained.',
};

const offlineChatMessage: ChatMessage = {
  id: 'chat-unavailable',
  sender: 'bot',
  text: 'Chat needs a deployed HTTPS AI endpoint before it can reply in production builds.',
};

function createMessage(sender: ChatMessage['sender'], text: string): ChatMessage {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sender,
    text,
  };
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatConfigured = isChatServiceConfigured();

  const trimmedInput = input.trim();
  const canSend = chatConfigured && trimmedInput.length > 0 && !isSending;

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const storedMessages = await loadChatHistory(user?.id);
        if (isMounted) {
          setMessages(storedMessages.length > 0 ? storedMessages : [chatConfigured ? welcomeMessage : offlineChatMessage]);
        }
      } catch {
        setMessages([chatConfigured ? welcomeMessage : offlineChatMessage]);
      }
    };

    void loadHistory();
    return () => {
      isMounted = false;
    };
  }, [chatConfigured, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      void replaceLocalChatHistory(messages.filter((message) => message.id !== welcomeMessage.id)).catch(() => {});
    }
  }, [messages, user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, isSending]);

  const placeholderTextColor = useMemo(() => colors.textMuted, [colors.textMuted]);

  const handleSend = async () => {
    if (!canSend) return;

    const userText = trimmedInput;
    const userMessage = createMessage('user', userText);
    setMessages((current) => [...current, userMessage]);
    void saveChatMessage(userMessage, user?.id).catch(() => {});
    setInput('');
    setIsSending(true);

    try {
      const reply = await sendChatMessage(userText);
      const botMessage = createMessage('bot', reply);
      setMessages((current) => [...current, botMessage]);
      void saveChatMessage(botMessage, user?.id).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach the chat service.';
      const botMessage = createMessage('bot', message);
      setMessages((current) => [...current, botMessage]);
      void saveChatMessage(botMessage, user?.id).catch(() => {});
    } finally {
      setIsSending(false);
    }
  };

  const handleInputKeyPress = (event: { nativeEvent: { key?: string; shiftKey?: boolean } }) => {
    const { key, shiftKey } = event.nativeEvent;
    if (key !== 'Enter') return;

    const webEvent = event as unknown as { preventDefault?: () => void };
    webEvent.preventDefault?.();

    if (shiftKey) {
      setInput((current) => `${current}\n`);
      return;
    }

    void handleSend();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      style={[styles.container, { backgroundColor: colors.screenBackground }]}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item.text} sender={item.sender} />}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isSending ? (
            <View style={styles.typingRow}>
              <View style={[styles.typingAvatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.typingAvatarText, { color: colors.primaryStrong }]}>AI</Text>
              </View>
              <View
                style={[styles.typingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}
                testID="chat-typing-indicator"
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.typingText, { color: colors.textSecondary }]}>AI is thinking...</Text>
              </View>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.composer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TextInput
          testID="chat-message-input"
          value={input}
          onChangeText={setInput}
          placeholder={chatConfigured ? 'Message the assistant' : 'Chat requires a deployed HTTPS endpoint'}
          placeholderTextColor={placeholderTextColor}
          multiline
          returnKeyType="send"
          enterKeyHint="send"
          submitBehavior="submit"
          onSubmitEditing={handleSend}
          onKeyPress={handleInputKeyPress}
          editable={chatConfigured && !isSending}
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
        />
        <Pressable
          testID="chat-send-button"
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!canSend}
          onPress={handleSend}
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons name="send" color={canSend ? colors.onPrimary : colors.textMuted} size={20} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 12,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingAvatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  typingBubble: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 118,
    borderRadius: 23,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
