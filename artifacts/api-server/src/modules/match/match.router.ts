/**
 * modules/match/match.router.ts
 *
 * HTTP transport layer for discover, swipe, and match endpoints.
 * Validates requests, delegates to matchService, returns responses.
 * No business logic here.
 */

import { Router } from "express";
import { optionalAuth } from "../../middleware/auth.js";
import { matchService } from "./match.service.js";
import { ALL_MOCK_USERS } from "../../fixtures/mockUsers.js";
import { userService } from "../user/user.service.js";

const router = Router();

// ── GET /api/users/discover ───────────────────────────────────────────────────

router.get("/users/discover", optionalAuth, async (req, res) => {
  const country = (req.query.country as string) || "all";
  const minAge = req.query.minAge ? Number(req.query.minAge) : 18;
  const maxAge = req.query.maxAge ? Number(req.query.maxAge) : 99;
  const langLevel = (req.query.langLevel as string) || "all";
  const interestsRaw = (req.query.interests as string) || "";
  const interests = interestsRaw ? interestsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const gender = (req.query.gender as string) || "all";
  const smoking = (req.query.smoking as string) || "all";
  const drinking = (req.query.drinking as string) || "all";
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;

  const filterOpts = { country, minAge, maxAge, langLevel, interests, gender, smoking, drinking };

  if (req.user) {
    try {
      const pool = await matchService.discoverForAuthUser(req.user.userId, filterOpts);
      res.json({ users: pool.slice(offset, offset + limit), total: pool.length, offset, limit });
      return;
    } catch (err) {
      console.error("[discover] DB error, falling back to mock pool:", err);
    }
  }

  const viewerId = (req.query.viewerId as string) || "me";
  const pool = matchService.discoverForGuest(viewerId, filterOpts);
  res.json({ users: pool.slice(offset, offset + limit), total: pool.length, offset, limit });
});

// ── POST /api/users/:id/like ──────────────────────────────────────────────────

router.post("/users/:id/like", optionalAuth, async (req, res) => {
  const toId = String(req.params.id);

  if (req.user) {
    try {
      const result = await matchService.likeAsAuthUser(req.user.userId, toId);
      res.json(result);
    } catch (err) {
      console.error("[like] error:", err);
      res.status(500).json({ error: "서버 오류" });
    }
    return;
  }

  const viewerId = (req.body?.viewerId as string) || "me";
  const mockUser = ALL_MOCK_USERS.find((u) => u.id === toId);
  if (!mockUser && !/^\d+$/.test(toId)) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(matchService.likeAsGuest(viewerId, toId));
});

// ── POST /api/users/:id/pass ──────────────────────────────────────────────────

router.post("/users/:id/pass", optionalAuth, async (req, res) => {
  const toId = String(req.params.id);

  if (req.user) {
    try {
      await matchService.passAsAuthUser(req.user.userId, toId);
      res.json({ passed: true });
    } catch (err) {
      console.error("[pass] error:", err);
      res.status(500).json({ error: "서버 오류" });
    }
    return;
  }

  const viewerId = (req.body?.viewerId as string) || "me";
  matchService.passAsGuest(viewerId, toId);
  res.json({ passed: true });
});

// ── GET /api/users/matches ────────────────────────────────────────────────────

router.get("/users/matches", optionalAuth, async (req, res) => {
  if (req.user) {
    try {
      const matches = await matchService.getMatchesForAuthUser(req.user.userId);
      res.json({ matches });
      return;
    } catch (err) {
      console.error("[matches] DB error:", err);
    }
  }

  const viewerId = (req.query.viewerId as string) || "me";
  res.json({ matches: matchService.getMatchesForGuest(viewerId) });
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────

router.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  if (/^\d+$/.test(id)) {
    try {
      const user = await userService.getUserById(parseInt(id, 10));
      if (user) { res.json(user); return; }
    } catch (err) {
      console.error("[users/:id] DB error:", err);
    }
  }

  const mockUser = ALL_MOCK_USERS.find((u) => u.id === id);
  if (mockUser) { res.json(mockUser); return; }

  res.status(404).json({ error: "User not found" });
});

// ── POST /api/users/:id/like-back (demo only) ─────────────────────────────────

router.post("/users/:id/like-back", (req, res) => {
  const fromId = String(req.params.id);
  const toId = (req.body?.viewerId as string) || "me";
  res.json(matchService.likeBack(fromId, toId));
});

// ── POST /api/users/reset ─────────────────────────────────────────────────────

router.post("/users/reset", optionalAuth, async (req, res) => {
  const viewerId = (req.body?.viewerId as string) || "me";

  if (req.user) {
    try {
      const cleared = await matchService.resetForAuthUser(req.user.userId);
      res.json({ reset: true, cleared });
      return;
    } catch (err) {
      console.error("[reset] DB error:", err);
      res.status(500).json({ error: "서버 오류" });
      return;
    }
  }

  res.json({ reset: true, cleared: matchService.resetForGuest(viewerId) });
});

export default router;
