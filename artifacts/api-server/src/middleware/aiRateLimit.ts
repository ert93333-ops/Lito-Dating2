import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24시간

const DAILY_LIMITS: Record<string, number> = {
  free: 30,
  plus: 100,
  premium: 300,
};

interface BucketEntry {
  count: number;
  windowStart: number;
  plan: string;
}

const buckets = new Map<string, BucketEntry>();

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      if (now - entry.windowStart > WINDOW_MS) {
        buckets.delete(key);
      }
    }
  },
  60 * 60 * 1000,
);

function getBucketKey(req: Request): { key: string; plan: string } {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      const plan = (payload as { plan?: string }).plan ?? "free";
      return { key: `user:${payload.userId}`, plan };
    } catch {
      // 토큰 파싱 실패 → IP 기반
    }
  }
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "unknown";
  return { key: `ip:${ip}`, plan: "free" };
}

export function aiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const { key, plan } = getBucketKey(req);
  const limit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

  let entry = buckets.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now, plan };
    buckets.set(key, entry);
  }

  const remaining = Math.max(0, limit - entry.count);
  const resetAt = entry.windowStart + WINDOW_MS;

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining - 1));
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

  if (entry.count >= limit) {
    const resetInMin = Math.ceil((resetAt - now) / 60000);
    logger.warn({ key, plan, limit }, "AI rate limit exceeded");
    res.status(429).json({
      error: `AI 사용 한도를 초과했습니다. ${resetInMin}분 후에 다시 시도해 주세요.`,
      limit,
      remaining: 0,
      resetAt,
      upgradeRequired: plan === "free",
    });
    return;
  }

  entry.count += 1;
  next();
}

export function getAiRateLimitStats(): {
  activeKeys: number;
  topUsers: Array<{ key: string; count: number; plan: string; remaining: number }>;
} {
  const now = Date.now();
  const active = Array.from(buckets.entries())
    .filter(([, e]) => now - e.windowStart <= WINDOW_MS)
    .map(([key, e]) => ({
      key,
      count: e.count,
      plan: e.plan,
      remaining: Math.max(0, (DAILY_LIMITS[e.plan] ?? 30) - e.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { activeKeys: active.length, topUsers: active };
}
