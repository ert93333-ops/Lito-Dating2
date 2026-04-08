import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

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
    const { messages, targetLang } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      targetLang?: "ko" | "ja";
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // Build a readable conversation excerpt (last 6 messages max)
    const recent = messages.slice(-6);
    const conversationText = recent
      .map((m) => `${m.sender === "me" ? "Me" : "Them"}: ${m.text}`)
      .join("\n");

    const lang = targetLang === "ko" ? "Korean" : "Japanese";

    const systemPrompt = `You are a dating app assistant helping someone reply naturally and warmly.
The user is on a Korean-Japanese dating app. Generate ONE short, friendly, and natural reply in ${lang}.
Rules:
- Keep it to 1–2 sentences
- Sound genuine, warm, and curious (ask a follow-up question when fitting)
- Use natural ${lang} phrasing, not overly formal
- Do NOT include any explanation or translation — just the reply text itself
- Do NOT include quotation marks around the reply`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 120,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the recent conversation:\n${conversationText}\n\nWrite a reply I can send:`,
        },
      ],
    });

    const suggestion = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!suggestion) {
      res.status(500).json({ error: "No suggestion generated" });
      return;
    }

    res.json({ suggestion });
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
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

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
    const { messages, targetLang } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      targetLang?: "ko" | "ja";
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const recent = messages.slice(-8);
    const conversationText = recent
      .map((m) => `${m.sender === "me" ? "Me" : "Them"}: ${m.text}`)
      .join("\n");

    const lang = targetLang === "ko" ? "Korean" : "Japanese";

    const systemPrompt = `You are a conversation coach for a Korean-Japanese dating app.
Analyse the conversation and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Return exactly this JSON structure:
{
  "summary": "1-2 sentence summary in Korean (한국어) — explain what the other person is expressing, e.g. '상대가 호감을 보이며 같이 연습하자고 제안했어요'",
  "tones": [
    {
      "emoji": "😊",
      "label": "편하게",
      "suggestions": ["${lang} reply option 1", "${lang} reply option 2"],
      "tip": "Korean coaching tip for this tone"
    },
    {
      "emoji": "🔥",
      "label": "적극적으로",
      "suggestions": ["${lang} reply option 1", "${lang} reply option 2"],
      "tip": "Korean coaching tip for this tone"
    },
    {
      "emoji": "😏",
      "label": "가볍게",
      "suggestions": ["${lang} reply option 1", "${lang} reply option 2"],
      "tip": "Korean coaching tip for this tone"
    }
  ]
}

Rules:
- summary: natural warm Korean, brief, describes what the other person is expressing
- tone emoji and label: keep exactly as shown above (😊 편하게, 🔥 적극적으로, 😏 가볍게)
- suggestions: write in ${lang} — 2 natural, warm, genuine replies per tone, each 1-2 sentences
- tip: 1 brief practical coaching tip per tone, in Korean, e.g. "이모지를 넣으면 더 가볍게 느껴져요"
- Return ONLY the raw JSON object, nothing else`;

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
// client-side by prsSignals.ts), runs an LLM pass to score the semantic
// features that heuristics cannot capture well (Warmth, Authenticity,
// Linguistic Matching), then computes the final stage-weighted PRS.
//
// Body: { featureWindow: InterestFeatureWindow, viewerLang: "ko" | "ja" }
// Response: { prs, confidence, stage, reasons[], lowConfidenceReason? }
//
// Design notes:
//  • LLM is used ONLY as a semantic feature extractor, not as the final scorer.
//  • The scoring formula runs deterministically on the server from LLM outputs.
//  • Framing must avoid overclaiming — we surface signals, not certainties.

// ── Stage-weighted scoring formula ────────────────────────────────────────────
//
// V1 product priors (subject to A/B tuning). Weights sum to 1.0 per stage.

const STAGE_WEIGHTS = {
  opening: {
    responsiveness: 0.26,
    reciprocity: 0.22,
    temporal: 0.18,
    warmth: 0.14,
    linguistic: 0.12,
    progression: 0.08,
  },
  discovery: {
    reciprocity: 0.22,
    linguistic: 0.18,
    responsiveness: 0.18,
    temporal: 0.14,
    progression: 0.14,
    warmth: 0.14,
  },
  escalation: {
    progression: 0.28,
    temporal: 0.20,
    reciprocity: 0.18,
    responsiveness: 0.14,
    linguistic: 0.10,
    warmth: 0.10,
  },
} as const;

const PENALTY_WEIGHTS = {
  earlyOversharePenalty: 0.30,
  selfPromotionPenalty: 0.25,
  genericTemplatePenalty: 0.20,
  nonContingentTopicSwitchPenalty: 0.15,
  scamRiskPenalty: 0.10,
} as const;

/** Clamp to [0, 1]. */
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Weighted average of a feature group's fields given a weights object. */
function weightedAvg(values: Record<string, number>, weights: Record<string, number>): number {
  let sum = 0;
  let wSum = 0;
  for (const [k, w] of Object.entries(weights)) {
    if (k in values) {
      sum += (values[k] ?? 0) * w;
      wSum += w;
    }
  }
  return wSum > 0 ? sum / wSum : 0;
}

/** Generate localized reason codes from the feature window + semantic scores. */
function buildReasonCodes(
  featureWindow: Record<string, unknown>,
  semanticScores: { warmth: number; authenticity: number; linguisticMatch: number },
  viewerLang: "ko" | "ja",
  confidence: number
): { reasons: string[]; lowConfidenceReason?: string } {
  const reasons: string[] = [];

  // Helper: extract nested numeric field safely
  const field = (group: string, key: string): number => {
    const g = (featureWindow as Record<string, Record<string, number>>)[group];
    return g?.[key] ?? 0;
  };

  const ko = viewerLang === "ko";

  // ── Low confidence override ────────────────────────────────────────────────
  if (confidence < 40) {
    return {
      reasons: [],
      lowConfidenceReason: ko
        ? "아직 대화 데이터가 충분하지 않아요. 더 대화를 나눠보세요."
        : "まだ会話データが十分ではありません。もう少し話してみましょう。",
    };
  }

  // ── Positive signals ───────────────────────────────────────────────────────
  if (field("responsiveness", "followUpQuestionRate") > 0.5) {
    reasons.push(
      ko
        ? "상대방이 자주 질문을 이어가고 있어요"
        : "相手が頻繁に質問を続けています"
    );
  }
  if (field("responsiveness", "contingentReplyScore") > 0.5) {
    reasons.push(
      ko
        ? "상대방이 대화 맥락을 자연스럽게 이어가고 있어요"
        : "相手が会話の文脈を自然に続けています"
    );
  }
  if (field("responsiveness", "validationScore") > 0.4) {
    reasons.push(
      ko ? "상대방이 공감과 반응을 잘 표현해요" : "相手が共感と反応をよく示しています"
    );
  }
  if (field("reciprocity", "partnerReinitiation") > 0.5) {
    reasons.push(
      ko
        ? "상대방이 먼저 대화를 다시 시작한 적이 있어요"
        : "相手が会話を再び始めたことがあります"
    );
  }
  if (field("temporal", "baselineAdjustedReplySpeed") > 0.65) {
    reasons.push(
      ko
        ? "상대방이 초반보다 더 빠르게 답장하고 있어요"
        : "相手は最初より速く返信しています"
    );
  }
  if (field("progression", "availabilitySharing") > 0.5) {
    reasons.push(
      ko ? "상대방이 구체적인 시간 가능 여부를 공유했어요" : "相手が具体的な空き時間を共有しました"
    );
  }
  if (field("progression", "callOrDateAcceptance") > 0.5) {
    reasons.push(
      ko ? "통화나 만남에 긍정적인 신호가 있어요" : "通話や会いたいという前向きなサインがあります"
    );
  }
  if (semanticScores.warmth > 0.6) {
    reasons.push(
      ko ? "대화 전반에 따뜻한 분위기가 느껴져요" : "会話全体に温かい雰囲気が感じられます"
    );
  }
  if (semanticScores.authenticity > 0.65) {
    reasons.push(
      ko
        ? "상대방의 메시지가 구체적이고 진실된 느낌이에요"
        : "相手のメッセージが具体的で誠実な感じがします"
    );
  }

  // ── Cautionary / mixed signals ─────────────────────────────────────────────
  if (field("reciprocity", "disclosureTurnTaking") < 0.4) {
    reasons.push(
      ko ? "대화가 한쪽으로 치우쳐져 있어요" : "会話が一方的になっています"
    );
  }
  if (field("penalties", "scamRiskPenalty") > 0.5) {
    reasons.push(
      ko ? "⚠️ 주의 필요한 표현이 감지됐어요" : "⚠️ 注意が必要な表現が検出されました"
    );
  }
  if (field("temporal", "replyConsistency") < 0.35) {
    reasons.push(
      ko ? "상대방의 답장 패턴이 불규칙해요" : "相手の返信パターンが不規則です"
    );
  }

  // Default if nothing triggered
  if (reasons.length === 0) {
    reasons.push(
      ko
        ? "아직 명확한 신호를 파악하기 어려워요"
        : "まだ明確なシグナルを把握するのが難しいです"
    );
  }

  return { reasons: reasons.slice(0, 4) };
}

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
    const stage = (featureWindow.stage as string) ?? "opening";
    const confidence = typeof featureWindow.confidence === "number"
      ? featureWindow.confidence
      : 50;

    // ── LLM semantic feature extraction ─────────────────────────────────────
    // Uses the last N messages to score warmth, authenticity, and linguistic match.
    // These are the three signals that heuristics handle poorly.
    // LLM returns normalised 0–1 scores, NOT the final PRS.

    const recentMsgs = Array.isArray(featureWindow.recentMessages)
      ? (featureWindow.recentMessages as Array<{ sender: string; text: string }>)
          .slice(-8)
          .map((m) => `${m.sender === "me" ? "Me" : "Partner"}: ${m.text}`)
          .join("\n")
      : "";

    const localePair = (
      featureWindow.translation as Record<string, unknown>
    )?.localePair ?? "KR-JP";

    const semanticPrompt = `You are analyzing a conversation on a Korean-Japanese dating app.
Locale pair: ${localePair}. Language for reasoning: ${lang === "ko" ? "Korean" : "Japanese"}.

Return ONLY a JSON object (no markdown, no explanation) with these three fields:
- warmth: float 0.0-1.0 (how warm, kind, and emotionally supportive is the PARTNER's language?)
- authenticity: float 0.0-1.0 (how specific and genuine is the PARTNER's writing vs generic/template-like?)
- linguisticMatch: float 0.0-1.0 (how much does the PARTNER adapt their style/length/tone to mirror the other person?)

IMPORTANT FRAMING RULES:
- Score the PARTNER's messages only (lines starting with "Partner:")
- 0.0 = very low, 0.5 = neutral, 1.0 = very high
- Do NOT output anything other than the JSON object

Conversation:
${recentMsgs || "(no messages yet)"}`;

    let semanticScores = { warmth: 0.5, authenticity: 0.5, linguisticMatch: 0.5 };

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
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()) as Record<string, unknown>;

      semanticScores = {
        warmth: typeof parsed.warmth === "number" ? clamp01(parsed.warmth) : 0.5,
        authenticity: typeof parsed.authenticity === "number" ? clamp01(parsed.authenticity) : 0.5,
        linguisticMatch: typeof parsed.linguisticMatch === "number" ? clamp01(parsed.linguisticMatch) : 0.5,
      };
    } catch (e) {
      console.warn("[ai/prs] LLM semantic extraction failed, using defaults:", e);
    }

    // ── Inject semantic scores into feature groups ────────────────────────────
    const fw = featureWindow as Record<string, Record<string, number>>;
    const warmthGroup = {
      otherFocusScore: fw.warmth?.otherFocusScore ?? 0.5,
      warmthScore: semanticScores.warmth,          // LLM score
      authenticityScore: semanticScores.authenticity, // LLM score
    };
    const linguisticGroup = {
      lsmProxy: fw.linguistic?.lsmProxy ?? 0.5,
      topicAlignment: fw.linguistic?.topicAlignment ?? 0.5,
      formatAccommodation: fw.linguistic?.formatAccommodation ?? 0.5,
      linguisticMatch: semanticScores.linguisticMatch, // LLM score
    };

    // ── Stage-weighted PRS formula ────────────────────────────────────────────
    const weights = STAGE_WEIGHTS[stage as keyof typeof STAGE_WEIGHTS] ?? STAGE_WEIGHTS.opening;

    const groupAvg = (group: Record<string, number>) =>
      Object.values(group).reduce((s, v) => s + v, 0) / Object.keys(group).length;

    const responsivenessScore = groupAvg({
      followUpQuestionRate: fw.responsiveness?.followUpQuestionRate ?? 0,
      contingentReplyScore: fw.responsiveness?.contingentReplyScore ?? 0,
      validationScore: fw.responsiveness?.validationScore ?? 0,
    });
    const reciprocityScore = groupAvg({
      disclosureTurnTaking: fw.reciprocity?.disclosureTurnTaking ?? 0.5,
      disclosureBalance: fw.reciprocity?.disclosureBalance ?? 0.5,
      partnerReinitiation: fw.reciprocity?.partnerReinitiation ?? 0,
    });
    const linguisticScore = groupAvg(linguisticGroup);
    const temporalScore = groupAvg({
      baselineAdjustedReplySpeed: fw.temporal?.baselineAdjustedReplySpeed ?? 0.5,
      replyConsistency: fw.temporal?.replyConsistency ?? 0.5,
    });
    const warmthScore = groupAvg(warmthGroup);
    const progressionScore = groupAvg({
      futureOrientation: fw.progression?.futureOrientation ?? 0,
      availabilitySharing: fw.progression?.availabilitySharing ?? 0,
      callOrDateAcceptance: fw.progression?.callOrDateAcceptance ?? 0,
    });

    const groupScores: Record<string, number> = {
      responsiveness: responsivenessScore,
      reciprocity: reciprocityScore,
      linguistic: linguisticScore,
      temporal: temporalScore,
      warmth: warmthScore,
      progression: progressionScore,
    };

    const prsRaw = weightedAvg(groupScores, weights as unknown as Record<string, number>);

    // Compute penalty
    const penalties = fw.penalties ?? {};
    const penaltyRaw = weightedAvg(penalties as Record<string, number>, PENALTY_WEIGHTS as unknown as Record<string, number>);
    const penaltyAdjusted = clamp01(prsRaw - penaltyRaw * 0.5);

    const prs = Math.round(clamp01(penaltyAdjusted) * 100);

    const { reasons, lowConfidenceReason } = buildReasonCodes(
      featureWindow,
      semanticScores,
      lang,
      confidence
    );

    console.log(`[ai/prs] stage=${stage} prs=${prs} confidence=${confidence} locale=${localePair}`);

    res.json({
      prs,
      confidence,
      stage,
      reasons,
      ...(lowConfidenceReason ? { lowConfidenceReason } : {}),
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ai/prs] error:", err);
    res.status(500).json({ error: "Failed to compute PRS" });
  }
});

export default router;
