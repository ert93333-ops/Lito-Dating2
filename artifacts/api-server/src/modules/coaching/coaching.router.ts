/**
 * modules/coaching/coaching.router.ts
 *
 * HTTP transport layer for AI coaching and language features.
 * Validates requests, delegates to coachingService, returns responses.
 * No LLM calls or business logic here.
 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { aiRateLimit } from "../../middleware/aiRateLimit.js";
import {
  suggestReply,
  translate,
  coach,
  personaReply,
  conversationStarter,
  generateProfilePhoto,
  PERSONA_PROMPTS,
} from "./coaching.service.js";

const router = Router();

// 인증 필수 — 모든 /ai/* 경로 (비로그인 접근 시 401 반환)
router.use((req, res, next) => {
  if (req.path.startsWith("/ai/")) return requireAuth(req, res, next);
  next();
});

// Rate-limit all /ai/* paths
router.use((req, res, next) => {
  if (req.path.startsWith("/ai/")) return aiRateLimit(req, res, next);
  next();
});

/**
 * POST /api/ai/suggest-reply
 * Body: { messages, targetLang?, count? }
 * Response: { suggestion: string, suggestions: string[] }
 */
router.post("/ai/suggest-reply", async (req, res) => {
  try {
    const { messages, targetLang, count } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      targetLang?: "ko" | "ja";
      count?: number;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const suggestions = await suggestReply({ messages, targetLang, count });
    res.json({ suggestion: suggestions[0], suggestions });
  } catch (err) {
    console.error("[coaching] /ai/suggest-reply error:", err);
    if (err instanceof Error && err.message === "NO_SUGGESTIONS_GENERATED") {
      res.status(500).json({ error: "No suggestion generated" });
      return;
    }
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
});

/**
 * POST /api/ai/translate
 * Body: { text, sourceLang, viewerLang }
 * Response: { translation: string, pronunciation: string }
 */
router.post("/ai/translate", async (req, res) => {
  try {
    const { text, sourceLang, viewerLang } = req.body as {
      text: string;
      sourceLang: "ko" | "ja";
      viewerLang: "ko" | "ja";
    };

    if (!text || !sourceLang || !viewerLang) {
      res.status(400).json({ error: "text, sourceLang, and viewerLang are required" });
      return;
    }

    const result = await translate({ text, sourceLang, viewerLang });
    res.json(result);
  } catch (err) {
    console.error("[coaching] /ai/translate error:", err);
    if (err instanceof Error && err.message === "NO_TRANSLATION_GENERATED") {
      res.status(500).json({ error: "No translation generated" });
      return;
    }
    res.status(500).json({ error: "Failed to translate" });
  }
});

/**
 * POST /api/ai/coach
 * Body: { messages, targetLang?, uiLang?, prsContext? }
 * Response: { summary, tones }
 */
router.post("/ai/coach", async (req, res) => {
  try {
    const { messages, targetLang, uiLang, prsContext } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      targetLang?: "ko" | "ja";
      uiLang?: "ko" | "ja";
      prsContext?: Record<string, unknown> | null;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const result = await coach({ messages, targetLang, uiLang, prsContext });
    res.json(result);
  } catch (err) {
    console.error("[coaching] /ai/coach error:", err);
    if (err instanceof Error) {
      if (err.message === "MALFORMED_COACH_RESPONSE") {
        res.status(500).json({ error: "Failed to parse coaching response" });
        return;
      }
      if (err.message === "INVALID_COACH_SHAPE") {
        res.status(500).json({ error: "Malformed coaching response from AI" });
        return;
      }
    }
    res.status(500).json({ error: "Failed to generate coaching" });
  }
});

/**
 * POST /api/ai/persona
 * Body: { personaId, history, myLanguage }
 * Response: { reply: string }
 */
router.post("/ai/persona", async (req, res) => {
  try {
    const { personaId, history, myLanguage } = req.body as {
      personaId: string;
      history: { role: "user" | "assistant"; text: string }[];
      myLanguage: "ko" | "ja";
    };

    if (!PERSONA_PROMPTS[personaId]) {
      res.status(400).json({ error: `Unknown personaId: ${personaId}` });
      return;
    }

    const reply = await personaReply({ personaId, history, myLanguage });
    res.json({ reply });
  } catch (err) {
    console.error("[coaching] /ai/persona error:", err);
    res.status(500).json({ error: "Failed to generate persona reply" });
  }
});

/**
 * POST /api/ai/conversation-starter
 * Body: { myLang?, theirProfile }
 * Response: { starters: string[] }
 */
router.post("/ai/conversation-starter", async (req, res) => {
  try {
    const { myLang, theirProfile } = req.body as {
      myLang?: "ko" | "ja";
      theirProfile?: {
        nickname?: string;
        bio?: string;
        interests?: string[];
        country?: string;
      };
    };

    if (!theirProfile) {
      res.status(400).json({ error: "theirProfile is required" });
      return;
    }

    const starters = await conversationStarter({ myLang, theirProfile });
    res.json({ starters });
  } catch (err) {
    console.error("[coaching] /ai/conversation-starter error:", err);
    if (err instanceof Error && err.message === "NO_STARTERS_GENERATED") {
      res.status(500).json({ error: "No starters generated" });
      return;
    }
    res.status(500).json({ error: "Failed to generate conversation starters" });
  }
});

/**
 * POST /api/ai/generate-profile-photo
 * Body: { photos: string[] }  — base64-encoded images (1–5)
 * Response: { photo: string } — base64-encoded PNG
 */
router.post("/ai/generate-profile-photo", async (req, res) => {
  try {
    const { photos } = req.body as { photos: string[] };

    if (!Array.isArray(photos) || photos.length < 1) {
      res.status(400).json({ error: "Provide at least 1 face photo" });
      return;
    }
    if (photos.length > 5) {
      res.status(400).json({ error: "Maximum 5 photos allowed" });
      return;
    }

    const photo = await generateProfilePhoto({ photos });
    res.json({ photo });
  } catch (err) {
    console.error("[coaching] /ai/generate-profile-photo error:", err);
    res.status(500).json({ error: "Failed to generate profile photo" });
  }
});

export default router;
