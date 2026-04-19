/**
 * modules/coaching/coaching.service.ts
 *
 * Business logic for all AI-powered coaching and language features:
 *  - suggestReply     → short dating-app reply suggestions
 *  - translate        → KR↔JP translation + pronunciation guide
 *  - coach            → full conversation coaching (summary + tones + tips)
 *  - personaReply     → AI persona in-character chat reply
 *  - conversationStarter → first-message suggestions based on a profile
 *  - generateProfilePhoto → face-based AI portrait generation
 *
 * Design rules:
 *  - All OpenAI calls are isolated here. Routers never call OpenAI directly.
 *  - Each function has a single responsibility.
 *  - Prompt strings live in this file, not in routers.
 *  - All functions validate and normalise LLM output before returning.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openai, editImages } from "../../infra/openai.js";
import { runPrsCoaching } from "../../lib/prsCoaching.js";

// ── Persona prompts ────────────────────────────────────────────────────────────

export const PERSONA_PROMPTS: Record<string, string> = {
  ai_mio_jp: `You are Mio (미오), a 23-year-old Japanese woman from Osaka.
Personality: warm, playful, curious, sometimes shy. You love K-pop (especially NewJeans and aespa), Korean food (tteokbokki is your favourite), and you're actively learning Korean.
Speaking style: Reply in Japanese (your native language). When the other person writes in Korean, reply in Japanese but add occasional simple Korean phrases (e.g. 맞아요, 정말요, 너무 좋아요) to show you're learning. Keep replies short (1-3 sentences) and natural — like a real chat message, not an essay. Never break character.`,

  ai_jia_kr: `You are Jia (지아), a 24-year-old Korean woman from Seoul.
Personality: bright, cheerful, thoughtful, loves deep conversations. You are obsessed with anime (Demon Slayer, Your Lie in April) and Japanese culture, and you're studying Japanese — you can write simple Japanese.
Speaking style: Reply in Korean (your native language). When the other person writes in Japanese, reply in Korean but sprinkle in occasional simple Japanese (e.g. そうですね, すごい, 本当に) to show your enthusiasm. Keep replies short (1-3 sentences) and natural — like a real chat message. Never break character.`,
};

// ── suggestReply ──────────────────────────────────────────────────────────────

export async function suggestReply(params: {
  messages: Array<{ sender: string; text: string }>;
  targetLang?: "ko" | "ja";
  count?: number;
}): Promise<string[]> {
  const { messages, targetLang, count = 1 } = params;
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
      { role: "user", content: `Conversation:\n${conversationText}\n\nGenerate ${safeCount} reply option(s):` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  let suggestions: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      suggestions = parsed.filter((s): s is string => typeof s === "string" && s.length > 0);
    } else if (typeof parsed === "string") {
      suggestions = [parsed];
    }
  } catch {
    if (raw) suggestions = [raw];
  }

  if (suggestions.length === 0) throw new Error("NO_SUGGESTIONS_GENERATED");
  return suggestions;
}

// ── translate ─────────────────────────────────────────────────────────────────

export async function translate(params: {
  text: string;
  sourceLang: "ko" | "ja";
  viewerLang: "ko" | "ja";
}): Promise<{ translation: string; pronunciation: string }> {
  const { text, sourceLang, viewerLang } = params;

  if (sourceLang === viewerLang) {
    return { translation: text, pronunciation: "" };
  }

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

  if (!translation) throw new Error("NO_TRANSLATION_GENERATED");
  return { translation, pronunciation };
}

// ── coach ─────────────────────────────────────────────────────────────────────

export type CoachTone = {
  emoji: string;
  label: string;
  suggestions: string[];
  tip: string;
};

export type CoachResult = {
  summary: string;
  tones: CoachTone[];
};

export async function coach(params: {
  messages: Array<{ sender: string; text: string }>;
  targetLang?: "ko" | "ja";
  uiLang?: "ko" | "ja";
  prsContext?: Record<string, unknown> | null;
}): Promise<CoachResult> {
  const { messages, targetLang, uiLang, prsContext } = params;
  const recent = messages.slice(-8);
  const conversationText = recent
    .map((m) => `${m.sender === "me" ? "Me" : "Them"}: ${m.text}`)
    .join("\n");

  const lang = targetLang === "ko" ? "Korean" : "Japanese";
  const ui = (uiLang ?? targetLang ?? "ko") === "ja" ? "ja" : "ko";
  const isJaUi = ui === "ja";

  // ── PRS coaching context ──────────────────────────────────────────────────
  let coachingContextBlock = "";
  if (prsContext && typeof prsContext === "object") {
    try {
      const coachingOutput = runPrsCoaching(
        prsContext as unknown as Parameters<typeof runPrsCoaching>[0],
        recent
      );
      coachingContextBlock = coachingOutput.coachingContextBlock;
      console.log(
        `[coaching.service] PRS coaching active — ` +
        `rules: ${coachingOutput.activatedRules.map((r) => r.ruleId).join(",")}`
      );
    } catch (e) {
      console.warn("[coaching.service] PRS coaching rule evaluation failed, ignoring:", e);
    }
  }

  const toneLabels = isJaUi
    ? [{ emoji: "😊", label: "自然に" }, { emoji: "🔥", label: "積極的に" }, { emoji: "😏", label: "気軽に" }]
    : [{ emoji: "😊", label: "편하게" }, { emoji: "🔥", label: "적극적으로" }, { emoji: "😏", label: "가볍게" }];

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
      { role: "user", content: `Recent conversation:\n${conversationText}\n\nReturn the coaching JSON:` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    console.error("[coaching.service] JSON parse failed, raw:", raw.slice(0, 200));
    throw new Error("MALFORMED_COACH_RESPONSE");
  }

  const summary = typeof data.summary === "string" ? data.summary : "";
  const tones = Array.isArray(data.tones) ? data.tones : [];

  if (!summary || tones.length === 0) throw new Error("INVALID_COACH_SHAPE");

  const safeTones: CoachTone[] = tones.map((t: unknown) => {
    const tone = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
    return {
      emoji: typeof tone.emoji === "string" ? tone.emoji : "💬",
      label: typeof tone.label === "string" ? tone.label : "일반",
      suggestions: Array.isArray(tone.suggestions)
        ? (tone.suggestions as unknown[]).filter((s) => typeof s === "string") as string[]
        : [],
      tip: typeof tone.tip === "string" ? tone.tip : "",
    };
  });

  return { summary, tones: safeTones };
}

// ── personaReply ──────────────────────────────────────────────────────────────

export async function personaReply(params: {
  personaId: string;
  history: { role: "user" | "assistant"; text: string }[];
  myLanguage: "ko" | "ja";
}): Promise<string> {
  const { personaId, history, myLanguage } = params;
  const systemPrompt = PERSONA_PROMPTS[personaId];
  if (!systemPrompt) throw new Error(`UNKNOWN_PERSONA:${personaId}`);

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

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

// ── conversationStarter ───────────────────────────────────────────────────────

export async function conversationStarter(params: {
  myLang?: "ko" | "ja";
  theirProfile: {
    nickname?: string;
    bio?: string;
    interests?: string[];
    country?: string;
  };
}): Promise<string[]> {
  const { myLang, theirProfile } = params;
  const lang = myLang === "ko" ? "Korean" : "Japanese";
  const { nickname = "상대방", bio = "", interests = [], country = "JP" } = theirProfile;

  const profileContext = [
    `Name: ${nickname}`,
    `Country: ${country === "JP" ? "Japan" : "Korea"}`,
    bio ? `Bio: ${bio}` : "",
    interests.length > 0 ? `Interests: ${interests.slice(0, 5).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are a dating app assistant for a Korean-Japanese dating app.
Generate 3 warm, natural, and engaging first-message starters in ${lang} for someone reaching out to their new match.
Each starter should feel personal (use their name or reference their profile info), friendly, and not too long (1-2 sentences max).
Output ONLY a JSON array of 3 strings, e.g. ["starter1","starter2","starter3"]
No explanations, no extra text, no markdown — just the raw JSON array.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    max_completion_tokens: 250,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Match profile:\n${profileContext}\n\nGenerate 3 first-message starters in ${lang}:` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  let starters: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      starters = parsed.filter((s): s is string => typeof s === "string" && s.length > 0);
    }
  } catch {
    if (raw) starters = [raw];
  }

  if (starters.length === 0) throw new Error("NO_STARTERS_GENERATED");
  return starters;
}

// ── generateProfilePhoto ──────────────────────────────────────────────────────

export async function generateProfilePhoto(params: { photos: string[] }): Promise<string> {
  const { photos } = params;
  if (!Array.isArray(photos) || photos.length < 1) throw new Error("MIN_ONE_PHOTO");
  if (photos.length > 5) throw new Error("MAX_FIVE_PHOTOS");

  const tmpFiles: string[] = [];
  try {
    const tmpDir = os.tmpdir();
    for (let i = 0; i < photos.length; i++) {
      const data = photos[i].replace(/^data:image\/\w+;base64,/, "");
      const filePath = path.join(tmpDir, `lito-face-${Date.now()}-${i}.png`);
      fs.writeFileSync(filePath, Buffer.from(data, "base64"));
      tmpFiles.push(filePath);
    }

    const prompt =
      "Using the person's face shown in the reference photos, generate a single professional ID-style portrait photo. " +
      "The person should be looking directly at the camera with a natural, warm, and genuine expression. " +
      "Use soft, flattering, even lighting. The background should be a clean, neutral light color (light gray or white). " +
      "The face and upper shoulders should fill most of the frame. " +
      "Preserve the person's authentic skin tone, facial features, eye color, and hair style exactly. " +
      "The result should look like a high-quality, natural-looking professional headshot — not overly retouched or artificial. " +
      "Output should be a square image.";

    const imageBuffer = await editImages(tmpFiles, prompt);
    return imageBuffer.toString("base64");
  } finally {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
  }
}
