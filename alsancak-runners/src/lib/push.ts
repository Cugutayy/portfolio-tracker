const PUSH_TIMEOUT_MS = 5000;

// Send push notification via Expo Push Service
export async function sendPushNotification(pushToken: string, title: string, body: string, data?: Record<string, any>) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: 'default',
        data: data || {},
      }),
      signal: controller.signal,
    });
  } catch (e) {
    console.error('Push notification failed:', e);
  } finally {
    clearTimeout(timeout);
  }
}

// Send to multiple tokens
export async function sendPushNotifications(tokens: string[], title: string, body: string, data?: Record<string, any>) {
  const messages = tokens
    .filter(t => t && t.startsWith('ExponentPushToken'))
    .map(to => ({ to, title, body, sound: 'default' as const, data: data || {} }));

  if (messages.length === 0) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });
  } catch (e) {
    console.error('Push notifications failed:', e);
  } finally {
    clearTimeout(timeout);
  }
}
