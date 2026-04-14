import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  generateConversationInterestSnapshot,
  computeConfidenceScore,
  type SemanticScores,
} from "../lib/prsScoring.js";
import { runPrsCoaching } from "../lib/prsCoaching.js";
import {
  trackPrsEvent,
  getAggregates,
  getRecentEvents,
  type LocalePair,
} from "../lib/prsAnalytics.js";

const router = Router();

// TODO: Future improvements:
// - Add per-user rate limiting to prevent abuse
// - Cache repeated suggestions for identical conversation contexts
// - Allow callers to specify target language (ko/ja) explicitly
// - Stream the reply token-by-token for a faster perceived response
// - Add conversation history summarisation for very long threads

/**
 * POST /api/ai/suggest-reply
 *
 * Generates a short, natural dating-style reply suggestion based on
 * the last few messages in a conversation.
 *
 * Body: { messages: Array<{ sender: "me" | "them", text: string }>, targetLang: "ko" | "ja" }
 * Response: { suggestion: string }
 */
router.post("/ai/suggest-reply", async (req, res) => {
  try {
    const { messages, targetLang, count = 1 } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      targetLang?: "ko" | "ja";
      count?: number;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const safeCount = Math.min(Math.max(Number(count) || 1, 1), 3);
    const recent = messages.slice(-6);
    const conversationText = recent
      .map((m) => `${m.sender === "me" ? "Me" : "Them"}: ${m.text}`)
      .join("\n");

    const lang = targetLang === "ko" ? "Korean" : "Japanese";

    const systemPrompt = `You are a dating app assistant helping someone reply naturally and warmly.
The user is on a Korean-Japanese dating app. Generate exactly ${safeCount} distinct, short reply option(s) in ${lang}.
Rules:
- Each reply must be 1–2 sentences only
- Each reply should feel different in tone (e.g. warm, playful, curious)
- Sound genuine and natural, not overly formal
- Output ONLY a JSON array of strings, e.g. ["reply1","reply2","reply3"]
- No explanations, no extra keys, no markdown — just the raw JSON array`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Conversation:\n${conversationText}\n\nGenerate ${safeCount} reply option(s):`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    // Parse JSON array; fall back to a single-item array
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        suggestions = parsed.filter((s): s is string => typeof s === "string" && s.length > 0);
      } else if (typeof parsed === "string") {
        suggestions = [parsed];
      }
    } catch {
      // If JSON parse fails, use raw text as single suggestion
      if (raw) suggestions = [raw];
    }

    if (suggestions.length === 0) {
      res.status(500).json({ error: "No suggestion generated" });
      return;
    }

    // Backward compat: keep `suggestion` (first item) + new `suggestions` array
    res.json({ suggestion: suggestions[0], suggestions });
  } catch (err) {
    console.error("[ai/suggest-reply] error:", err);
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
});

// TODO: Future improvements for translation:
// - Batch all messages in a conversation in one API call to reduce latency/cost
// - Cache results server-side (Redis/KV) keyed by (text, sourceLang, viewerLang)
// - Add per-user rate limiting to prevent abuse

/**
 * POST /api/ai/translate
 *
 * Translates a single message and generates a pronunciation guide.
 *
 * Body: {
 *   text: string           — message text to translate
 *   sourceLang: "ko"|"ja" — language the sender wrote in
 *   viewerLang: "ko"|"ja" — language the viewer reads
 * }
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

    // If already in the viewer's language, skip
    if (sourceLang === viewerLang) {
      res.json({ translation: text, pronunciation: "" });
      return;
    }

    // Determine what each field should be
    // sourceLang=ja, viewerLang=ko → translate ja→ko, pronunciation in Korean phonetics of Japanese
    // sourceLang=ko, viewerLang=ja → translate ko→ja, pronunciation in Katakana phonetics of Korean

    const translationDirection =
      sourceLang === "ja" && viewerLang === "ko"
        ? "Japanese to Korean"
        : "Korean to Japanese";

    const pronunciationInstructions =
      sourceLang === "ja" && viewerLang === "ko"
        ? "Write the pronunciation of the ORIGINAL Japanese text using Korean phonetic characters (한글 발음 표기). This helps Korean speakers sound out the Japanese."
        : "Write the pronunciation of the ORIGINAL Korean text using Katakana characters. This helps Japanese speakers sound out the Korean.";

    const systemPrompt = `You are a bilingual translation assistant for a Korean-Japanese dating app.
Given a message, you must output EXACTLY two lines and nothing else:
Line 1: The ${translationDirection} translation — natural, warm, casual dating-app style.
Line 2: ${pronunciationInstructions}

Rules:
- Output ONLY the two lines, no labels, no explanation, no punctuation changes
- Keep both lines short and natural
- Line 2 must be a genuine phonetic guide using the appropriate script`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);

    const translation = lines[0] ?? "";
    const pronunciation = lines[1] ?? "";

    if (!translation) {
      res.status(500).json({ error: "No translation generated" });
      return;
    }

    res.json({ translation, pronunciation });
  } catch (err) {
    console.error("[ai/translate] error:", err);
    res.status(500).json({ error: "Failed to translate" });
  }
});

/**
 * POST /api/ai/coach
 *
 * Conversation coaching — analyses the recent chat and returns structured
 * coaching guidance. Does NOT return a message to insert into the input.
 *
 * Body: { messages: Array<{ sender: "me"|"them", text: string }>, targetLang: "ko"|"ja" }
 * Response: { summary, directions, examples, tips }
 */
router.post("/ai/coach", async (req, res) => {
  try {
    const { messages, targetLang, uiLang, prsContext } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      /** Language the viewer writes in — drives reply suggestion language. */
      targetLang?: "ko" | "ja";
      /** UI language of the viewer — drives summary, tips, and tone labels. */
      uiLang?: "ko" | "ja";
      /** Optional: ConversationInterestSnapshot from the client's cached PRS state. */
      prsContext?: Record<string, unknown> | null;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const recent = messages.slice(-8);
    const conversationText = recent
      .map((m) => `${m.sender === "me" ? "Me" : "Them"}: ${m.text}`)
      .join("\n");

    // lang = language for reply suggestions (what the viewer will type/send)
    const lang = targetLang === "ko" ? "Korean" : "Japanese";
    // ui = viewer's UI language — drives summary, tips, and tone labels
    const ui = (uiLang ?? targetLang ?? "ko") === "ja" ? "ja" : "ko";

    // ── PRS Coaching Context Block ────────────────────────────────────────────
    // If the client sent a cached PRS snapshot, run the rule engine to build a
    // coaching context block. This is injected into the LLM system prompt as
    // structured, manipulation-free coaching guidance.
    // Falls back gracefully if prsContext is absent or malformed.
    let coachingContextBlock = "";
    let primaryDirective = "";

    if (prsContext && typeof prsContext === "object") {
      try {
        const coachingOutput = runPrsCoaching(
          prsContext as unknown as Parameters<typeof runPrsCoaching>[0],
          recent
        );
        coachingContextBlock = coachingOutput.coachingContextBlock;
        primaryDirective = coachingOutput.primaryDirective;
        console.log(
          `[ai/coach] PRS coaching active — directive: ${primaryDirective}` +
          ` rules: ${coachingOutput.activatedRules.map((r) => r.ruleId).join(",")}`
        );
      } catch (e) {
        console.warn("[ai/coach] PRS coaching rule evaluation failed, ignoring:", e);
      }
    }

    // ── Language-aware prompt strings ─────────────────────────────────────────
    // All user-visible coach text (summary, tip, tone labels) follows `ui`.
    // Reply suggestions follow `lang` (= viewer's writing language).
    const isJaUi = ui === "ja";

    const toneLabels = isJaUi
      ? [
          { emoji: "😊", label: "自然に" },
          { emoji: "🔥", label: "積極的に" },
          { emoji: "😏", label: "気軽に" },
        ]
      : [
          { emoji: "😊", label: "편하게" },
          { emoji: "🔥", label: "적극적으로" },
          { emoji: "😏", label: "가볍게" },
        ];

    const summaryInstruction = isJaUi
      ? `"summary": "1-2文の要約（日本語）— 相手が何を伝えているか説明する。例: '相手はNewJeansの話や語学の話で盛り上がり、ビデオ通話を提案して期待感を表現しています'"`
      : `"summary": "1-2 sentence summary in Korean (한국어) — explain what the other person is expressing, e.g. '상대가 호감을 보이며 같이 연습하자고 제안했어요'"`;

    const tipInstruction = isJaUi
      ? `tip: 1 brief practical coaching tip per tone, in Japanese (日本語), e.g. "絵文字を入れると軽い雰囲気になりますよ"`
      : `tip: 1 brief practical coaching tip per tone, in Korean, e.g. "이모지를 넣으면 더 가볍게 느껴져요"`;

    const summaryRule = isJaUi
      ? "- summary: 自然で温かみのある日本語、簡潔に、相手が表現していることを説明する"
      : "- summary: natural warm Korean, brief, describes what the other person is expressing";

    const toneLabelRule = isJaUi
      ? `- tone emoji and label: keep exactly as shown above (😊 自然に, 🔥 積極的に, 😏 気軽に)`
      : `- tone emoji and label: keep exactly as shown above (😊 편하게, 🔥 적극적으로, 😏 가볍게)`;

    const systemPrompt = `You are a conversation coach for a Korean-Japanese dating app.
Analyse the conversation and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Return exactly this JSON structure:
{
  ${summaryInstruction},
  "tones": [
    {
      "emoji": "${toneLabels[0].emoji}",
      "label": "${toneLabels[0].label}",
      "suggestions": ["${lang} reply option 1", "${lang} reply option 2"],
      "tip": "${isJaUi ? "Japanese coaching tip for this tone" : "Korean coaching tip for this tone"}"
    },
    {
      "emoji": "${toneLabels[1].emoji}",
      "label": "${toneLabels[1].label}",
      "suggestions": ["${lang} reply option 1", "${lang} reply option 2"],
      "tip": "${isJaUi ? "Japanese coaching tip for this tone" : "Korean coaching tip for this tone"}"
    },
    {
      "emoji": "${toneLabels[2].emoji}",
      "label": "${toneLabels[2].label}",
      "suggestions": ["${lang} reply option 1", "${lang} reply option 2"],
      "tip": "${isJaUi ? "Japanese coaching tip for this tone" : "Korean coaching tip for this tone"}"
    }
  ]
}

Rules:
${summaryRule}
${toneLabelRule}
- suggestions: write in ${lang} — 2 natural, warm, genuine replies per tone, each 1-2 sentences
- ${tipInstruction}
- Return ONLY the raw JSON object, nothing else
${coachingContextBlock ? `\n${coachingContextBlock}` : ""}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Recent conversation:\n${conversationText}\n\nReturn the coaching JSON:`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    // Strip markdown code fences if GPT included them
    const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      console.error("[ai/coach] JSON parse failed, raw:", raw.slice(0, 200));
      res.status(500).json({ error: "Failed to parse coaching response" });
      return;
    }

    // Validate expected shape — must have summary (string) and tones (array)
    const summary = typeof data.summary === "string" ? data.summary : "";
    const tones = Array.isArray(data.tones) ? data.tones : [];

    if (!summary || tones.length === 0) {
      console.error("[ai/coach] invalid shape, summary:", !!summary, "tones:", tones.length, "raw:", raw.slice(0, 200));
      res.status(500).json({ error: "Malformed coaching response from AI" });
      return;
    }

    // Normalise each tone — guard missing fields
    const safeTones = tones.map((t: unknown) => {
      const tone = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
      return {
        emoji: typeof tone.emoji === "string" ? tone.emoji : "💬",
        label: typeof tone.label === "string" ? tone.label : "일반",
        suggestions: Array.isArray(tone.suggestions)
          ? (tone.suggestions as unknown[]).filter((s) => typeof s === "string")
          : [],
        tip: typeof tone.tip === "string" ? tone.tip : "",
      };
    });

    console.log("[ai/coach] OK — summary len:", summary.length, "tones:", safeTones.length);
    res.json({ summary, tones: safeTones });
  } catch (err) {
    console.error("[ai/coach] error:", err);
    res.status(500).json({ error: "Failed to generate coaching" });
  }
});

// ── PRS: Partner Receptivity Score ────────────────────────────────────────────
//
// POST /api/ai/prs
//
// Accepts a pre-computed InterestFeatureWindow (heuristic features extracted
// client-side by services/prsSignals.ts), runs an LLM pass to extract the
// three semantic features heuristics cannot capture well (Warmth, Authenticity,
// Linguistic Matching), then delegates ALL scoring logic to lib/prsScoring.ts.
//
// Body:     { featureWindow: InterestFeatureWindow, viewerLang?: "ko" | "ja" }
// Response: ConversationInterestSnapshot + legacy compat fields (prs, confidence,
//           stage, reasons, lowConfidenceReason)
//
// Design notes:
//  • Route handler: I/O + LLM call ONLY. No formula logic here.
//  • lib/prsScoring.ts: deterministic scoring (no network, no side effects).
//  • LLM is a semantic feature extractor, not the final decision maker.
//  • Language: "engagement signals" only — never "love", "attraction", "certainty".

/** Clamp to [0, 1]. */
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

router.post("/ai/prs", async (req, res) => {
  try {
    const { featureWindow, viewerLang } = req.body as {
      featureWindow: Record<string, unknown>;
      viewerLang?: "ko" | "ja";
    };

    if (!featureWindow || typeof featureWindow !== "object") {
      res.status(400).json({ error: "featureWindow is required" });
      return;
    }

    const lang = viewerLang ?? "ko";

    const localePair = (
      featureWindow.translation as Record<string, unknown>
    )?.localePair ?? "KR-JP";

    // ── LLM semantic feature extraction ─────────────────────────────────────
    // Uses the last 8 partner messages to score the three features heuristics
    // handle poorly. LLM returns normalised 0–1 scores, NOT the final PRS.
    // On failure we fall back to neutral 0.5 (calibrated to be non-penalising).

    const recentMsgs = Array.isArray(featureWindow.recentMessages)
      ? (featureWindow.recentMessages as Array<{ sender: string; text: string }>)
          .slice(-8)
          .map((m) => `${m.sender === "me" ? "Me" : "Partner"}: ${m.text}`)
          .join("\n")
      : "";

    const semanticPrompt = `You are analyzing a conversation on a Korean-Japanese dating app.
Locale pair: ${localePair}. Language for reasoning: ${lang === "ko" ? "Korean" : "Japanese"}.

Return ONLY a JSON object (no markdown, no explanation) with these three fields:
- warmth: float 0.0-1.0 (how warm, kind, and emotionally supportive is the PARTNER's language?)
- authenticity: float 0.0-1.0 (how specific and genuine is the PARTNER's writing vs generic/template-like?)
- linguisticMatch: float 0.0-1.0 (how much does the PARTNER adapt their style/length/tone to mirror the other person?)

IMPORTANT:
- Score the PARTNER's messages only (lines starting with "Partner:")
- 0.0 = very low, 0.5 = neutral/unknown, 1.0 = very high
- Output ONLY the JSON object

Conversation:
${recentMsgs || "(no messages yet)"}`;

    let semanticScores: SemanticScores = { warmth: 0.5, authenticity: 0.5, linguisticMatch: 0.5 };

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        max_completion_tokens: 60,
        messages: [
          { role: "system", content: semanticPrompt },
          { role: "user", content: "Return the JSON scores:" },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const parsed = JSON.parse(
        raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()
      ) as Record<string, unknown>;

      semanticScores = {
        warmth: typeof parsed.warmth === "number" ? clamp01(parsed.warmth) : 0.5,
        authenticity: typeof parsed.authenticity === "number" ? clamp01(parsed.authenticity) : 0.5,
        linguisticMatch: typeof parsed.linguisticMatch === "number" ? clamp01(parsed.linguisticMatch) : 0.5,
      };
    } catch (e) {
      console.warn("[ai/prs] LLM semantic extraction failed, using defaults:", e);
    }

    // ── Scoring engine (pure, deterministic) ─────────────────────────────────
    // All formula logic lives in lib/prsScoring.ts.
    const snapshot = generateConversationInterestSnapshot(featureWindow, semanticScores);

    // ── Confidence score ──────────────────────────────────────────────────────
    // Re-derive from feature window (client may have sent a stale value).
    const { score: confidenceScore } = computeConfidenceScore(featureWindow);

    console.log(
      `[ai/prs] convId=${snapshot.conversationId} stage=${snapshot.stage} ` +
      `prs=${snapshot.prsScore} cs=${confidenceScore} lowCs=${snapshot.lowConfidenceState} ` +
      `locale=${localePair}`
    );

    // ── Telemetry ─────────────────────────────────────────────────────────────
    const hasScamSignal = snapshot.reasonCodes.includes("SCAM_RISK_DETECTED");
    const hasProgressionSignal =
      snapshot.reasonCodes.includes("CALL_DATE_SIGNAL") ||
      snapshot.reasonCodes.includes("AVAILABILITY_SHARED");
    const translationRate = Number(
      (featureWindow.translation as Record<string, unknown>)?.translatedMessageRate ?? 1
    );

    trackPrsEvent({
      kind: "interest_snapshot_generated",
      ts: Date.now(),
      conversationId: snapshot.conversationId,
      modelVersion: "v1",
      featureVersion: "v1",
      prsScore: snapshot.prsScore,
      confidenceScore,
      stage: snapshot.stage as "opening" | "discovery" | "escalation",
      localePair: (String(localePair)) as LocalePair,
      lowConfidenceState: snapshot.lowConfidenceState,
      reasonCodeCount: snapshot.reasonCodes.length,
      hasScamSignal,
      hasProgressionSignal,
      translationRate,
    });

    if (hasScamSignal) {
      trackPrsEvent({
        kind: "scam_penalty_triggered",
        ts: Date.now(),
        conversationId: snapshot.conversationId,
        modelVersion: "v1",
        scamRiskPenalty: Number(
          (featureWindow.penalties as Record<string, unknown>)?.scamRiskPenalty ?? 0
        ),
      });
    }

    if (translationRate < 0.4) {
      trackPrsEvent({
        kind: "translation_reliability_low",
        ts: Date.now(),
        conversationId: snapshot.conversationId,
        modelVersion: "v1",
        translatedRate: translationRate,
        localePair: (String(localePair)) as LocalePair,
      });
    }

    if (snapshot.lowConfidenceState === "mixed_signals") {
      trackPrsEvent({
        kind: "mixed_signals_detected",
        ts: Date.now(),
        conversationId: snapshot.conversationId,
        modelVersion: "v1",
      });
    }

    if (snapshot.lowConfidenceState === "low_confidence_hidden_score") {
      trackPrsEvent({
        kind: "low_confidence_hidden_score",
        ts: Date.now(),
        conversationId: snapshot.conversationId,
        modelVersion: "v1",
      });
    }

    // ── Response ──────────────────────────────────────────────────────────────
    // Returns the full ConversationInterestSnapshot PLUS legacy-compat fields
    // so existing callers (PRSInsightCard) continue to work without breaking.
    res.json({
      // Full snapshot (canonical)
      ...snapshot,
      confidenceScore,

      // Legacy compat fields for any existing clients using the old PRSResult shape
      prs: snapshot.prsScore,
      confidence: confidenceScore,
      stage: snapshot.stage,
      reasons: snapshot.generatedInsights.map((i) =>
        lang === "ko" ? i.textKo : i.textJa
      ),
      ...(snapshot.lowConfidenceState
        ? {
            lowConfidenceReason:
              lang === "ko"
                ? "아직 대화 데이터가 충분하지 않아요. 더 대화를 나눠보세요."
                : "まだ会話データが十分ではありません。もう少し話してみましょう。",
          }
        : {}),
      computedAt: snapshot.generatedAt,
    });
  } catch (err) {
    console.error("[ai/prs] error:", err);
    res.status(500).json({ error: "Failed to compute PRS" });
  }
});

// ── AI Persona Chat (TEST ONLY — delete before launch) ────────────────────────
//
// POST /api/ai/persona
// Generates an in-character reply from a test AI persona.
// Body: { personaId: string; history: {role:"user"|"assistant"; text:string}[]; myLanguage: "ko"|"ja" }

const PERSONA_PROMPTS: Record<string, string> = {
  ai_mio_jp: `You are Mio (미오), a 23-year-old Japanese woman from Osaka.
Personality: warm, playful, curious, sometimes shy. You love K-pop (especially NewJeans and aespa), Korean food (tteokbokki is your favourite), and you're actively learning Korean.
Speaking style: Reply in Japanese (your native language). When the other person writes in Korean, reply in Japanese but add occasional simple Korean phrases (e.g. 맞아요, 정말요, 너무 좋아요) to show you're learning. Keep replies short (1-3 sentences) and natural — like a real chat message, not an essay. Never break character.`,

  ai_jia_kr: `You are Jia (지아), a 24-year-old Korean woman from Seoul.
Personality: bright, cheerful, thoughtful, loves deep conversations. You are obsessed with anime (Demon Slayer, Your Lie in April) and Japanese culture, and you're studying Japanese — you can write simple Japanese.
Speaking style: Reply in Korean (your native language). When the other person writes in Japanese, reply in Korean but sprinkle in occasional simple Japanese (e.g. そうですね, すごい, 本当に) to show your enthusiasm. Keep replies short (1-3 sentences) and natural — like a real chat message. Never break character.`,
};

router.post("/ai/persona", async (req, res) => {
  try {
    const { personaId, history, myLanguage } = req.body as {
      personaId: string;
      history: { role: "user" | "assistant"; text: string }[];
      myLanguage: "ko" | "ja";
    };

    const systemPrompt = PERSONA_PROMPTS[personaId];
    if (!systemPrompt) {
      return res.status(400).json({ error: `Unknown personaId: ${personaId}` });
    }

    const contextNote = myLanguage === "ko"
      ? "The user you are chatting with is Korean."
      : "The user you are chatting with is Japanese.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${contextNote}` },
        ...history.map((m) => ({ role: m.role, content: m.text })),
      ],
      max_tokens: 150,
      temperature: 0.85,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    return res.json({ reply });
  } catch (err) {
    console.error("[ai/persona] error:", err);
    return res.status(500).json({ error: "Failed to generate persona reply" });
  }
});

// ── Admin / Debug endpoints ────────────────────────────────────────────────────
//
// These endpoints are for internal admin/debug use only.
// In production, add an admin middleware guard (e.g. check an ADMIN_TOKEN header
// or a session role). For now they are unguarded — for MVP/internal use.
//
// GET /api/admin/prs/aggregates — live telemetry aggregates
// GET /api/admin/prs/events     — last 50 raw telemetry events

router.get("/admin/prs/aggregates", (_req, res) => {
  res.json(getAggregates());
});

router.get("/admin/prs/events", (req, res) => {
  const n = Math.min(Number(req.query.n ?? 50), 200);
  res.json({ events: getRecentEvents(n) });
});

export default router;
