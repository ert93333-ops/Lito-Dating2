import { Router } from "express";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, users, userProfiles, oauthAccounts } from "@workspace/db";
import { signToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

const router = Router();

type SocialProvider = "google" | "apple" | "kakao" | "line";

async function verifyGoogleToken(accessToken: string): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { sub: string; email: string; name?: string };
    return { id: data.sub, email: data.email, name: data.name ?? "" };
  } catch { return null; }
}

async function verifyKakaoToken(accessToken: string): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const res = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      id: number;
      kakao_account?: { email?: string; profile?: { nickname?: string } };
    };
    const email = data.kakao_account?.email ?? `kakao_${data.id}@lito.app`;
    const name = data.kakao_account?.profile?.nickname ?? "카카오 사용자";
    return { id: String(data.id), email, name };
  } catch { return null; }
}

async function verifyLineToken(accessToken: string): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const res = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { userId: string; displayName: string };
    return { id: data.userId, email: `line_${data.userId}@lito.app`, name: data.displayName };
  } catch { return null; }
}

async function verifyAppleToken(
  providerUserId: string,
  email: string | undefined,
  name: string | undefined,
): Promise<{ id: string; email: string; name: string } | null> {
  if (!providerUserId) return null;
  return {
    id: providerUserId,
    email: email ?? `apple_${providerUserId.slice(0, 12)}@lito.app`,
    name: name ?? "Apple 사용자",
  };
}

/**
 * POST /api/auth/social
 *
 * Body: {
 *   provider: "google" | "apple" | "kakao" | "line"
 *   accessToken: string        (Google/Kakao/LINE)
 *   providerUserId?: string    (Apple only)
 *   email?: string             (Apple — provided only on first login)
 *   name?: string              (optional display name)
 *   country?: "KR" | "JP"
 *   language?: "ko" | "ja"
 * }
 */
router.post("/auth/social", async (req, res) => {
  try {
    const {
      provider,
      accessToken,
      providerUserId: rawProviderUserId,
      email: rawEmail,
      name: rawName,
      country = "KR",
      language = "ko",
    } = req.body as {
      provider: SocialProvider;
      accessToken?: string;
      providerUserId?: string;
      email?: string;
      name?: string;
      country?: string;
      language?: string;
    };

    if (!provider) {
      res.status(400).json({ error: "provider 필수입니다." });
      return;
    }

    let providerInfo: { id: string; email: string; name: string } | null = null;

    if (provider === "google") {
      if (!accessToken) { res.status(400).json({ error: "accessToken 필수입니다." }); return; }
      providerInfo = await verifyGoogleToken(accessToken);
    } else if (provider === "kakao") {
      if (!accessToken) { res.status(400).json({ error: "accessToken 필수입니다." }); return; }
      providerInfo = await verifyKakaoToken(accessToken);
    } else if (provider === "line") {
      if (!accessToken) { res.status(400).json({ error: "accessToken 필수입니다." }); return; }
      providerInfo = await verifyLineToken(accessToken);
    } else if (provider === "apple") {
      providerInfo = await verifyAppleToken(rawProviderUserId ?? "", rawEmail, rawName);
    } else {
      res.status(400).json({ error: "지원하지 않는 provider입니다." });
      return;
    }

    if (!providerInfo) {
      res.status(401).json({ error: "소셜 인증에 실패했습니다. 다시 시도해주세요." });
      return;
    }

    const existing = await db
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerUserId, providerInfo.id),
        )
      )
      .limit(1);

    let userId: number;

    if (existing.length > 0) {
      userId = existing[0].userId;
    } else {
      const emailLower = providerInfo.email.toLowerCase();
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, emailLower))
        .limit(1);

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
      } else {
        const fakeHash = await bcrypt.hash(
          `social_${provider}_${providerInfo.id}_${Date.now()}`,
          8,
        );
        const [newUser] = await db
          .insert(users)
          .values({
            email: emailLower,
            passwordHash: fakeHash,
            country,
            language,
          })
          .returning();
        userId = newUser.id;
        await db.insert(userProfiles).values({
          userId,
          nickname: providerInfo.name.slice(0, 50),
        });
      }

      await db.insert(oauthAccounts).values({
        userId,
        provider,
        providerUserId: providerInfo.id,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    const token = signToken({ userId: user.id, email: user.email, plan: (user.plan ?? "free") as "free" | "plus" | "premium" });
    logger.info({ provider, userId }, "Social login success");

    res.json({
      token,
      user: { id: user.id, email: user.email, country: user.country, language: user.language },
      profile: profile ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Social auth error");
    res.status(500).json({ error: "소셜 로그인 처리 중 오류가 발생했습니다." });
  }
});

export default router;
