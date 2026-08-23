import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  targetUserId?: string;
}

export async function runPushDispatchJob(payload: PushNotificationPayload): Promise<{ sent: number; failed: number }> {
  try {
    let tokens: string[] = [];

    if (payload.targetUserId) {
      const user = await db.select({ pushToken: usersTable.pushToken })
        .from(usersTable)
        .where(isNotNull(usersTable.pushToken))
        .limit(1);
      if (user[0]?.pushToken) tokens.push(user[0].pushToken);
    } else {
      const allUsers = await db.select({ pushToken: usersTable.pushToken })
        .from(usersTable)
        .where(isNotNull(usersTable.pushToken));
      tokens = allUsers.map(u => u.pushToken).filter((t): t is string => !!t);
    }

    if (tokens.length === 0) {
      logger.info("No registered push tokens found for dispatch");
      return { sent: 0, failed: 0 };
    }

    // Standard Expo Push Notification Service Batch Dispatch
    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const data = await res.json();
    logger.info({ count: tokens.length, status: res.status }, "Push notifications dispatched successfully");
    return { sent: tokens.length, failed: 0 };
  } catch (err) {
    logger.error({ err }, "Push dispatch job failed");
    return { sent: 0, failed: 1 };
  }
}