import { logger } from "../lib/logger.js";
import { PushTokenRepository } from "../repositories/pushtoken.repository.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo's documented hard limit per request.
const MAX_BATCH_SIZE = 100;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushResult {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

export const PushService = {
  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await PushTokenRepository.findByUser(userId);
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    return this.sendBatch(
      tokens.map(t => ({ to: t.token, title: payload.title, body: payload.body, data: payload.data })),
    );
  },

  async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<{ sent: number; failed: number }> {
    return this.sendBatch(
      tokens.map(t => ({ to: t, title: payload.title, body: payload.body, data: payload.data })),
    );
  },

  async sendBatch(messages: PushMessage[]): Promise<{ sent: number; failed: number }> {
    const valid = messages.filter(m => isExpoPushToken(m.to));
    const skipped = messages.length - valid.length;
    if (skipped > 0) {
      logger.warn({ skipped }, "Skipped push messages with non-Expo tokens");
    }
    if (valid.length === 0) return { sent: 0, failed: skipped };

    let sent = 0;
    let failed = skipped;

    for (const batch of chunk(valid, MAX_BATCH_SIZE)) {
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify(batch),
        });

        if (!res.ok) {
          failed += batch.length;
          logger.error({ status: res.status }, "Expo push API returned a non-2xx response");
          continue;
        }

        const json = (await res.json()) as { data?: ExpoPushResult[] };
        const results = json.data ?? [];

        for (let i = 0; i < batch.length; i++) {
          const result = results[i];
          const message = batch[i]!;

          if (result?.status === "ok") {
            sent++;
            continue;
          }

          failed++;
          logger.warn({ token: message.to, error: result?.message }, "Push delivery failed for a token");

          // The device uninstalled the app or the token otherwise expired —
          // stop sending to it so we don't keep paying the batch-size cost
          // and log noise for a token that will never succeed again.
          if (result?.details?.error === "DeviceNotRegistered") {
            await PushTokenRepository.removeByToken(message.to);
          }
        }
      } catch (err) {
        failed += batch.length;
        logger.error({ err }, "Push batch request failed to reach Expo");
      }
    }

    return { sent, failed };
  },
};