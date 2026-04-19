/**
 * modules/notification/notification.router.ts
 *
 * REST endpoints for the notification system.
 *
 * POST  /api/notifications/token         — register/update push token
 * DELETE /api/notifications/token        — deactivate push token
 * GET   /api/notifications/preferences   — get notification prefs
 * PUT   /api/notifications/preferences   — update notification prefs
 * GET   /api/notifications/inbox         — in-app inbox list
 * POST  /api/notifications/inbox/:id/read — mark single read
 * POST  /api/notifications/inbox/read-all — mark all read
 * GET   /api/notifications/inbox/unread-count — badge count
 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notificationRepository } from "./notification.repository.js";

const router = Router();

router.post("/notifications/token", requireAuth, async (req, res) => {
  try {
    const { pushToken, platform, appVersion, locale, timezone } = req.body as {
      pushToken: string;
      platform: string;
      appVersion?: string;
      locale?: string;
      timezone?: string;
    };

    if (!pushToken || !platform) {
      res.status(400).json({ error: "pushToken and platform are required" });
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
      res.status(400).json({ error: "pushToken required" });
      return;
    }
    await notificationRepository.deactivateToken(pushToken);
    res.json({ ok: true });
  } catch (err) {
    console.error("[notification] DELETE /token error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.get("/notifications/preferences", requireAuth, async (req, res) => {
  try {
    const prefs = await notificationRepository.getPreferences(req.user!.userId);
    res.json(
      prefs ?? {
        messagesEnabled: true,
        matchesEnabled: true,
        safetyEnabled: true,
        aiEnabled: false,
        promotionsEnabled: false,
        previewMode: "none",
        quietHoursStart: 22,
        quietHoursEnd: 8,
      }
    );
  } catch (err) {
    console.error("[notification] GET /preferences error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.put("/notifications/preferences", requireAuth, async (req, res) => {
  try {
    const {
      messagesEnabled,
      matchesEnabled,
      safetyEnabled,
      aiEnabled,
      promotionsEnabled,
      previewMode,
      quietHoursStart,
      quietHoursEnd,
    } = req.body as Record<string, unknown>;

    const updated = await notificationRepository.upsertPreferences(req.user!.userId, {
      ...(typeof messagesEnabled === "boolean" && { messagesEnabled }),
      ...(typeof matchesEnabled === "boolean" && { matchesEnabled }),
      ...(typeof safetyEnabled === "boolean" && { safetyEnabled }),
      ...(typeof aiEnabled === "boolean" && { aiEnabled }),
      ...(typeof promotionsEnabled === "boolean" && { promotionsEnabled }),
      ...(typeof previewMode === "string" && { previewMode }),
      ...(typeof quietHoursStart === "number" && { quietHoursStart }),
      ...(typeof quietHoursEnd === "number" && { quietHoursEnd }),
    });

    res.json(updated);
  } catch (err) {
    console.error("[notification] PUT /preferences error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

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
      res.status(400).json({ error: "invalid id" });
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
