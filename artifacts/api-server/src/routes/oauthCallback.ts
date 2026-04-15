/**
 * 서버사이드 OAuth 콜백 핸들러 (Google, Kakao, LINE)
 *
 * 플로우:
 *   1. 앱 → /api/auth/{provider}/start  (브라우저 오픈)
 *   2. 제공자 → /api/auth/{provider}/callback  (코드 전달)
 *   3. 서버: 코드 교환 → 유저 정보 → JWT 발급
 *   4. 서버 → lito://auth/callback?token=JWT  (앱으로 복귀)
 *
 * Google도 서버사이드로 처리 — expo-auth-session은 Expo Go 네이티브 모듈 충돌로 제외
 */

import { Router } from "express";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, users, userProfiles, oauthAccounts } from "@workspace/db";
import { signToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

const router = Router();

const APP_DEEP_LINK = "lito://auth/callback";

function errorRedirect(res: any, message: string) {
  const encoded = encodeURIComponent(message);
  res.redirect(`${APP_DEEP_LINK}?error=${encoded}`);
}

/** 실제 서버 베이스 URL (EXPO_PUBLIC_DOMAIN 우선, 없으면 req에서 추출) */
function getServerBase(req: any): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "http";
  const host = req.headers["x-forwarded-host"] ?? req.get?.("host") ?? req.hostname;
  return `${proto}://${host}`;
}

async function findOrCreateSocialUser(
  provider: string,
  providerUserId: string,
  email: string,
  name: string,
  country: string,
  language: string,
): Promise<number> {
  const existing = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, providerUserId)))
    .limit(1);

  if (existing.length > 0) return existing[0].userId;

  const emailLower = email.toLowerCase();
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, emailLower)).limit(1);

  let userId: number;
  if (existingUser.length > 0) {
    userId = existingUser[0].id;
  } else {
    const fakeHash = await bcrypt.hash(`social_${provider}_${providerUserId}_${Date.now()}`, 8);
    const [newUser] = await db
      .insert(users)
      .values({ email: emailLower, passwordHash: fakeHash, country, language })
      .returning();
    userId = newUser.id;
    await db.insert(userProfiles).values({ userId, nickname: name.slice(0, 50) });
  }

  await db.insert(oauthAccounts).values({ userId, provider, providerUserId });
  return userId;
}

// ── Kakao ─────────────────────────────────────────────────────────────────────

router.get("/auth/kakao/start", (req, res) => {
  const appKey = process.env.KAKAO_APP_KEY;
  if (!appKey) { errorRedirect(res, "카카오 설정 오류"); return; }

  const redirectUri = `${getServerBase(req)}/api/auth/kakao/callback`;
  const state = Buffer.from(JSON.stringify({
    country: req.query.country ?? "KR",
    language: req.query.language ?? "ko",
    t: Date.now(),
  })).toString("base64url");

  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${appKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
  res.redirect(url);
});

router.get("/auth/kakao/callback", async (req, res) => {
  const appKey = process.env.KAKAO_APP_KEY;
  const appSecret = process.env.KAKAO_CLIENT_SECRET ?? "";
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) { errorRedirect(res, "카카오 로그인이 취소되었습니다."); return; }

  try {
    const redirectUri = `${getServerBase(req)}/api/auth/kakao/callback`;
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: appKey!,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!tokenRes.ok) throw new Error("token exchange failed");
    const { access_token } = await tokenRes.json() as { access_token: string };

    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileRes.ok) throw new Error("profile fetch failed");
    const profile = await profileRes.json() as {
      id: number;
      kakao_account?: { email?: string; profile?: { nickname?: string } };
    };

    const stateData = state ? JSON.parse(Buffer.from(state, "base64url").toString()) : {};
    const email = profile.kakao_account?.email ?? `kakao_${profile.id}@lito.app`;
    const name = profile.kakao_account?.profile?.nickname ?? "카카오 사용자";

    const userId = await findOrCreateSocialUser("kakao", String(profile.id), email, name, stateData.country ?? "KR", stateData.language ?? "ko");
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const token = signToken({ userId: user.id, email: user.email });

    logger.info({ provider: "kakao", userId }, "Kakao login success");
    res.redirect(`${APP_DEEP_LINK}?token=${token}`);
  } catch (err) {
    logger.error({ err }, "Kakao callback error");
    errorRedirect(res, "카카오 로그인 처리 중 오류가 발생했습니다.");
  }
});

// ── LINE ──────────────────────────────────────────────────────────────────────

router.get("/auth/line/start", (req, res) => {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) { errorRedirect(res, "LINE 설정 오류"); return; }

  const redirectUri = `${getServerBase(req)}/api/auth/line/callback`;
  const state = Buffer.from(JSON.stringify({
    country: req.query.country ?? "JP",
    language: req.query.language ?? "ja",
    t: Date.now(),
  })).toString("base64url");

  const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile`;
  res.redirect(url);
});

router.get("/auth/line/callback", async (req, res) => {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code || !channelId || !channelSecret) {
    errorRedirect(res, "LINE 로그인이 취소되었습니다.");
    return;
  }

  try {
    const redirectUri = `${getServerBase(req)}/api/auth/line/callback`;
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });
    if (!tokenRes.ok) throw new Error("token exchange failed");
    const { access_token } = await tokenRes.json() as { access_token: string };

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileRes.ok) throw new Error("profile fetch failed");
    const profile = await profileRes.json() as { userId: string; displayName: string };

    const stateData = state ? JSON.parse(Buffer.from(state, "base64url").toString()) : {};
    const email = `line_${profile.userId}@lito.app`;

    const userId = await findOrCreateSocialUser("line", profile.userId, email, profile.displayName, stateData.country ?? "JP", stateData.language ?? "ja");
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const token = signToken({ userId: user.id, email: user.email });

    logger.info({ provider: "line", userId }, "LINE login success");
    res.redirect(`${APP_DEEP_LINK}?token=${token}`);
  } catch (err) {
    logger.error({ err }, "LINE callback error");
    errorRedirect(res, "LINE 로그인 처리 중 오류가 발생했습니다.");
  }
});

// ── Google ────────────────────────────────────────────────────────────────────

router.get("/auth/google/start", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) { errorRedirect(res, "Google 설정 오류"); return; }

  const redirectUri = `${getServerBase(req)}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({
    country: req.query.country ?? "KR",
    language: req.query.language ?? "ko",
    t: Date.now(),
  })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/auth/google/callback", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code || !clientId || !clientSecret) {
    errorRedirect(res, "Google 로그인이 취소되었습니다.");
    return;
  }

  try {
    const redirectUri = `${getServerBase(req)}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("token exchange failed");
    const { access_token } = await tokenRes.json() as { access_token: string };

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileRes.ok) throw new Error("profile fetch failed");
    const profile = await profileRes.json() as { sub: string; email: string; name?: string };

    const stateData = state ? JSON.parse(Buffer.from(state, "base64url").toString()) : {};
    const userId = await findOrCreateSocialUser(
      "google", profile.sub, profile.email,
      profile.name ?? "Google 사용자",
      stateData.country ?? "KR", stateData.language ?? "ko"
    );
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const token = signToken({ userId: user.id, email: user.email });

    logger.info({ provider: "google", userId }, "Google login success");
    res.redirect(`${APP_DEEP_LINK}?token=${token}`);
  } catch (err) {
    logger.error({ err }, "Google callback error");
    errorRedirect(res, "Google 로그인 처리 중 오류가 발생했습니다.");
  }
});

export default router;
