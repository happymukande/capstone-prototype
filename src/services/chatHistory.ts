import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { hasSupabaseConfig } from '../../lib/supabaseClient';

export type PersistedChatMessage = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  createdAt?: string;
};

const LOCAL_CHAT_HISTORY_KEY = 'capstone.chat.history.v1';

function isChatMessage(value: unknown): value is PersistedChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PersistedChatMessage>;
  return typeof candidate.id === 'string'
    && typeof candidate.text === 'string'
    && (candidate.sender === 'user' || candidate.sender === 'bot');
}

export async function loadChatHistory(userId?: string | null): Promise<PersistedChatMessage[]> {
  if (hasSupabaseConfig && supabase && userId) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    return (data ?? [])
      .filter((row) => row.sender === 'user' || row.sender === 'bot')
      .map((row) => ({
        id: String(row.id),
        sender: row.sender,
        text: String(row.message ?? ''),
        createdAt: row.created_at ?? undefined,
      }));
  }

  const raw = await AsyncStorage.getItem(LOCAL_CHAT_HISTORY_KEY);
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.filter(isChatMessage) : [];
}

export async function saveChatMessage(message: PersistedChatMessage, userId?: string | null): Promise<void> {
  if (hasSupabaseConfig && supabase && userId) {
    const { error } = await supabase.from('chat_messages').insert({
      id: message.id,
      user_id: userId,
      sender: message.sender,
      message: message.text,
    });

    if (error) throw error;
    return;
  }

  const existing = await loadChatHistory(null).catch(() => []);
  await AsyncStorage.setItem(LOCAL_CHAT_HISTORY_KEY, JSON.stringify([...existing, message]));
}

export async function replaceLocalChatHistory(messages: PersistedChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_CHAT_HISTORY_KEY, JSON.stringify(messages));
}
