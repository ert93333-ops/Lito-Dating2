/**
 * modules/notification/notification.router.ts
 *
 * REST endpoints for the MVP notification system.
 *
 * POST   /api/notifications/token             — register / update push token
 * DELETE /api/notifications/token             — deactivate push token (logout)
 * GET    /api/notifications/preferences       — fetch user prefs
 * PUT    /api/notifications/preferences       — update user prefs
 * GET    /api/notifications/inbox             — in-app inbox list
 * GET    /api/notifications/inbox/unread-count — badge count
 * POST   /api/notifications/inbox/:id/read   — mark single notification read
 * POST   /api/notifications/inbox/read-all   — mark all read
 *
 * All routes require authentication.
 * userId is always derived from req.user — never from the client body.
 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notificationRepository } from "./notification.repository.js";

const router = Router();

// ── Device token registration ─────────────────────────────────────────────────

router.post("/notifications/token", requireAuth, async (req, res) => {
  try {
    const { pushToken, platform, appVersion, locale, timezone } = req.body as {
      pushToken:   string;
      platform:    string;
      appVersion?: string;
      locale?:     string;
      timezone?:   string;
    };

    if (!pushToken || !platform) {
      res.status(400).json({ error: "pushToken과 platform은 필수입니다." });
      return;
    }

    const allowed = ["ios", "android", "web"];
    if (!allowed.includes(platform)) {
      res.status(400).json({ error: "platform은 ios | android | web 중 하나여야 합니다." });
      return;
    }

    await notificationRepository.upsertToken(req.user!.userId, platform, pushToken, {
      appVersion,
      locale,
      timezone,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("[notification] POST /token error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.delete("/notifications/token", requireAuth, async (req, res) => {
  try {
    const { pushToken } = req.body as { pushToken: string };
    if (!pushToken) {
      res.status(400).json({ error: "pushToken이 필요합니다." });
      return;
    }
    await notificationRepository.deactivateToken(pushToken);
    res.json({ ok: true });
  } catch (err) {
    console.error("[notification] DELETE /token error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// ── Preferences ────────────────────────────────────────────────────────────────

/**
 * Returns current prefs or safe defaults (no DB row yet).
 * safety_security is always reported as enabled — cannot be disabled.
 */
router.get("/notifications/preferences", requireAuth, async (req, res) => {
  try {
    const prefs = await notificationRepository.getPreferences(req.user!.userId);
    res.json(
      prefs
        ? {
            messagesEnabled:       prefs.messagesEnabled,
            matchesLikesEnabled:   prefs.matchesLikesEnabled,
            safetySecurityEnabled: true,   // always forced ON
            accountUpdatesEnabled: prefs.accountUpdatesEnabled,
            previewMode:           prefs.previewMode,
            quietHoursStart:       prefs.quietHoursStart,
            quietHoursEnd:         prefs.quietHoursEnd,
          }
        : {
            messagesEnabled:       true,
            matchesLikesEnabled:   true,
            safetySecurityEnabled: true,
            accountUpdatesEnabled: true,
            previewMode:           "none",
            quietHoursStart:       22,
            quietHoursEnd:         8,
          }
    );
  } catch (err) {
    console.error("[notification] GET /preferences error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.put("/notifications/preferences", requireAuth, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;

    const updated = await notificationRepository.upsertPreferences(req.user!.userId, {
      ...(typeof body["messagesEnabled"]       === "boolean" && { messagesEnabled:       body["messagesEnabled"] }),
      ...(typeof body["matchesLikesEnabled"]   === "boolean" && { matchesLikesEnabled:   body["matchesLikesEnabled"] }),
      // safetySecurityEnabled: client cannot disable — ignore any false value
      ...(body["safetySecurityEnabled"] === true             && { safetySecurityEnabled: true }),
      ...(typeof body["accountUpdatesEnabled"] === "boolean" && { accountUpdatesEnabled: body["accountUpdatesEnabled"] }),
      ...(typeof body["previewMode"]           === "string"  && { previewMode:           body["previewMode"] }),
      ...(typeof body["quietHoursStart"]       === "number"  && { quietHoursStart:       body["quietHoursStart"] }),
      ...(typeof body["quietHoursEnd"]         === "number"  && { quietHoursEnd:         body["quietHoursEnd"] }),
    });

    res.json({
      messagesEnabled:       updated.messagesEnabled,
      matchesLikesEnabled:   updated.matchesLikesEnabled,
      safetySecurityEnabled: true,   // always forced ON in response
      accountUpdatesEnabled: updated.accountUpdatesEnabled,
      previewMode:           updated.previewMode,
      quietHoursStart:       updated.quietHoursStart,
      quietHoursEnd:         updated.quietHoursEnd,
    });
  } catch (err) {
    console.error("[notification] PUT /preferences error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// ── In-app inbox ───────────────────────────────────────────────────────────────

router.get("/notifications/inbox", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 30), 50);
    const items = await notificationRepository.listInApp(req.user!.userId, limit);
    res.json({ items });
  } catch (err) {
    console.error("[notification] GET /inbox error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.get("/notifications/inbox/unread-count", requireAuth, async (req, res) => {
  try {
    const count = await notificationRepository.countUnread(req.user!.userId);
    res.json({ count });
  } catch (err) {
    console.error("[notification] GET /inbox/unread-count error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.post("/notifications/inbox/:id/read", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params["id"]), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "유효하지 않은 id입니다." });
      return;
    }
    await notificationRepository.markRead(id, req.user!.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[notification] POST /inbox/:id/read error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.post("/notifications/inbox/read-all", requireAuth, async (req, res) => {
  try {
    await notificationRepository.markAllRead(req.user!.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[notification] POST /inbox/read-all error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

export default router;
