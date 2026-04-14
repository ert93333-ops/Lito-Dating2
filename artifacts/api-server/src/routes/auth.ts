import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, userProfiles } from "@workspace/db";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, country, language } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
      return;
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "이미 사용 중인 이메일입니다." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        country: country ?? "KR",
        language: language ?? "ko",
      })
      .returning();

    await db.insert(userProfiles).values({ userId: user.id });

    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        country: user.country,
        language: user.language,
      },
    });
  } catch (err) {
    console.error("register error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        country: user.country,
        language: user.language,
      },
      profile: profile ?? null,
    });
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      return;
    }

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        country: user.country,
        language: user.language,
      },
      profile: profile ?? null,
    });
  } catch (err) {
    console.error("me error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// PUT /api/auth/profile
router.put("/auth/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { nickname, age, bio, intro, interests, photos, instagramHandle, languageLevel } =
      req.body;

    await db
      .update(userProfiles)
      .set({
        ...(nickname !== undefined && { nickname }),
        ...(age !== undefined && { age }),
        ...(bio !== undefined && { bio }),
        ...(intro !== undefined && { intro }),
        ...(interests !== undefined && { interests }),
        ...(photos !== undefined && { photos }),
        ...(instagramHandle !== undefined && { instagramHandle }),
        ...(languageLevel !== undefined && { languageLevel }),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    res.json({ profile });
  } catch (err) {
    console.error("update profile error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

export default router;
