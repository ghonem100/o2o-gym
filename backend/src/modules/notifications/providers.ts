import axios from 'axios';
import logger from '../../utils/logger';

export interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Sends a WhatsApp message via the WhatsApp Business Cloud API (Meta Graph API).
 * Falls back to a logged no-op when credentials are not configured (dev mode).
 */
export async function sendWhatsApp(to: string, message: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';

  if (!token || !phoneId) {
    logger.warn('WhatsApp not configured — message not sent (dev mode)', {
      to,
      preview: message.slice(0, 60),
    });
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  try {
    await axios.post(
      `${apiUrl}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: normalizeToInternational(to),
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return { success: true };
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? JSON.stringify(err.response?.data ?? err.message)
      : String(err);
    logger.error('WhatsApp send failed', { to, detail });
    return { success: false, error: detail };
  }
}

/**
 * Sends an SMS via Twilio. Falls back to a logged no-op when not configured.
 */
export async function sendSMS(to: string, message: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !authToken || !from) {
    logger.warn('SMS not configured — message not sent (dev mode)', { to });
    return { success: false, error: 'SMS credentials not configured' };
  }

  try {
    const params = new URLSearchParams({
      To: normalizeToInternational(to),
      From: from,
      Body: message,
    });
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      params.toString(),
      {
        auth: { username: sid, password: authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );
    return { success: true };
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? JSON.stringify(err.response?.data ?? err.message)
      : String(err);
    logger.error('SMS send failed', { to, detail });
    return { success: false, error: detail };
  }
}

/** Converts a local Egyptian number (01XXXXXXXXX) to international (201XXXXXXXXX). */
function normalizeToInternational(phone: string): string {
  const trimmed = phone.replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed.slice(1);
  if (trimmed.startsWith('00')) return trimmed.slice(2);
  if (trimmed.startsWith('0')) return `2${trimmed.slice(1)}`;
  return trimmed;
}
