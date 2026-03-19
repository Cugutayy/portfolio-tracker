// Send push notification via Expo Push Service
export async function sendPushNotification(pushToken: string, title: string, body: string, data?: Record<string, any>) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

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
    });
  } catch (e) {
    console.error('Push notification failed:', e);
  }
}

// Send to multiple tokens
export async function sendPushNotifications(tokens: string[], title: string, body: string, data?: Record<string, any>) {
  const messages = tokens
    .filter(t => t && t.startsWith('ExponentPushToken'))
    .map(to => ({ to, title, body, sound: 'default' as const, data: data || {} }));

  if (messages.length === 0) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error('Push notifications failed:', e);
  }
}
