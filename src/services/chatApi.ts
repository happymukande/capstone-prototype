import Constants from 'expo-constants';

export interface ChatResponse {
  reply: string;
}

const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as Record<string, unknown>;

const configuredBaseUrl = String(
  process.env.EXPO_PUBLIC_API_BASE_URL
    ?? extra.EXPO_PUBLIC_API_BASE_URL
    ?? extra.apiBaseUrl
    ?? ''
).trim();

function normalizeApiBaseUrl(value: string) {
  if (!value) return '';

  try {
    const url = new URL(value);
    const isLocalHost = ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
    const isAllowedDevUrl = __DEV__ && isLocalHost && url.protocol === 'http:';

    if (url.protocol !== 'https:' && !isAllowedDevUrl) {
      return '';
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function getApiBaseUrl() {
  return normalizeApiBaseUrl(configuredBaseUrl);
}

export function isChatServiceConfigured() {
  return Boolean(getApiBaseUrl());
}

export async function sendChatMessage(message: string): Promise<string> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('Chat is unavailable until EXPO_PUBLIC_API_BASE_URL points to a deployed HTTPS AI endpoint.');
  }

  const response = await fetch(`${apiBaseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<ChatResponse> & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `Chat request failed (${response.status})`);
  }

  if (typeof payload.reply !== 'string') {
    throw new Error('Backend returned an invalid chat response.');
  }

  return payload.reply;
}
