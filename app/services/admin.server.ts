import type { AdminRole, SystemLogLevel } from "@prisma/client";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import prisma from "../db.server";

const SESSION_COOKIE = "mango_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function hashPasswordForStorage(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}$${hashPassword(password, salt)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const candidate = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
  } catch {
    return false;
  }
}

export async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@mango-feed.app";
  const password = process.env.ADMIN_PASSWORD || "changeme";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.adminUser.create({
    data: {
      email,
      name: "System Admin",
      passwordHash: hashPasswordForStorage(password),
      role: "SUPER_ADMIN",
    },
  });
}

export async function authenticateAdmin(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_TTL_MS;
  await prisma.appSetting.upsert({
    where: { key: `admin_session_${token}` },
    create: {
      key: `admin_session_${token}`,
      value: JSON.stringify({ userId: user.id, expires }),
    },
    update: {
      value: JSON.stringify({ userId: user.id, expires }),
    },
  });

  return { user, token, expires };
}

export async function getAdminFromSession(request: Request) {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;

  const row = await prisma.appSetting.findUnique({
    where: { key: `admin_session_${token}` },
  });
  if (!row) return null;

  const session = JSON.parse(row.value) as { userId: string; expires: number };
  if (session.expires < Date.now()) {
    await prisma.appSetting.delete({ where: { key: row.key } });
    return null;
  }

  return prisma.adminUser.findUnique({ where: { id: session.userId } });
}

export function createAdminSessionCookie(token: string, expires: number): string {
  const maxAge = Math.floor((expires - Date.now()) / 1000);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearAdminSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function listAdminUsers() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function createAdminUser(input: {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
}) {
  return prisma.adminUser.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: hashPasswordForStorage(input.password),
    },
  });
}

export async function updateAdminUser(
  id: string,
  input: Partial<{ name: string; role: AdminRole; isActive: boolean; password: string }>,
) {
  return prisma.adminUser.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      ...(input.password
        ? { passwordHash: hashPasswordForStorage(input.password) }
        : {}),
    },
  });
}

export async function listShopsForAdmin() {
  return prisma.shop.findMany({
    orderBy: { installedAt: "desc" },
    include: {
      _count: { select: { products: true, feedConfigs: true, subscriptions: true } },
    },
  });
}

export async function listSubscriptionsForAdmin() {
  return prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: { shop: { select: { shopDomain: true, name: true } } },
  });
}

export async function requireAdmin(request: Request, roles?: AdminRole[]) {
  const admin = await getAdminFromSession(request);
  if (!admin) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/admin/login" },
    });
  }
  if (roles && !roles.includes(admin.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return admin;
}
