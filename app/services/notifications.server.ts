import type { NotificationType } from "@prisma/client";
import prisma from "../db.server";
import { logSystemEvent } from "./system-log.server";

interface SendEmailOptions {
  shopId?: string | null;
  type: NotificationType;
  to: string;
  subject: string;
  body: string;
}

export async function listNotificationPreferences(shopId: string) {
  return prisma.notificationPreference.findMany({
    where: { shopId },
    orderBy: [{ type: "asc" }, { email: "asc" }],
  });
}

export async function upsertNotificationPreference(input: {
  shopId: string;
  type: NotificationType;
  email: string;
  isEnabled: boolean;
}) {
  return prisma.notificationPreference.upsert({
    where: {
      shopId_type_email: {
        shopId: input.shopId,
        type: input.type,
        email: input.email,
      },
    },
    create: input,
    update: { isEnabled: input.isEnabled },
  });
}

async function deliverEmail(to: string, subject: string, body: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@mango-feed.app";

  if (!host || !user || !pass) {
    console.info(`[email:mock] To: ${to} | Subject: ${subject}`);
    return;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, text: body });
}

export async function sendNotificationEmail(options: SendEmailOptions) {
  const log = await prisma.notificationLog.create({
    data: {
      shopId: options.shopId,
      type: options.type,
      email: options.to,
      subject: options.subject,
      body: options.body,
      status: "PENDING",
    },
  });

  try {
    await deliverEmail(options.to, options.subject, options.body);
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "SENT" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: message },
    });
    await logSystemEvent({
      level: "ERROR",
      category: "notifications",
      message: "Failed to send notification email",
      metadata: { type: options.type, email: options.to, error: message },
      shopId: options.shopId ?? undefined,
    });
  }
}

export async function notifyShop(
  shopId: string,
  type: NotificationType,
  subject: string,
  body: string,
) {
  const preferences = await prisma.notificationPreference.findMany({
    where: { shopId, type, isEnabled: true },
  });

  if (preferences.length === 0) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (shop?.email) {
      await sendNotificationEmail({
        shopId,
        type,
        to: shop.email,
        subject,
        body,
      });
    }
    return;
  }

  for (const pref of preferences) {
    await sendNotificationEmail({
      shopId,
      type,
      to: pref.email,
      subject,
      body,
    });
  }
}

export async function notifyFeedError(input: {
  shopId?: string | null;
  feedName: string;
  errorMessage: string;
}) {
  if (!input.shopId) return;
  await notifyShop(
    input.shopId,
    "FEED_ERROR",
    `Feed error: ${input.feedName}`,
    `Your feed "${input.feedName}" encountered an error:\n\n${input.errorMessage}`,
  );
}

export async function notifyFeedExpiry(input: {
  shopId: string;
  feedName: string;
  expiresAt: Date;
}) {
  await notifyShop(
    input.shopId,
    "FEED_EXPIRY",
    `Feed expiring: ${input.feedName}`,
    `Your feed "${input.feedName}" expires on ${input.expiresAt.toISOString()}. Regenerate or extend the feed to avoid disruption.`,
  );
}

export async function notifySyncFailure(input: {
  shopId: string;
  shopDomain: string;
  errorMessage: string;
}) {
  await notifyShop(
    input.shopId,
    "SYNC_FAILURE",
    `Sync failed: ${input.shopDomain}`,
    `Product sync failed for ${input.shopDomain}:\n\n${input.errorMessage}`,
  );
}

export async function listNotificationLogs(limit = 50) {
  return prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function checkExpiringFeeds() {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiring = await prisma.feedConfig.findMany({
    where: {
      isActive: true,
      expiresAt: { lte: soon, gte: new Date() },
      shopId: { not: null },
    },
  });

  for (const feed of expiring) {
    if (feed.shopId) {
      await notifyFeedExpiry({
        shopId: feed.shopId,
        feedName: feed.name,
        expiresAt: feed.expiresAt!,
      });
    }
  }
}
