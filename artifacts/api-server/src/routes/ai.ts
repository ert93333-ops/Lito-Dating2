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

    let data: unknown;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      console.error("[ai/coach] JSON parse failed, raw:", raw.slice(0, 200));
      res.status(500).json({ error: "Failed to parse coaching response" });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error("[ai/coach] error:", err);
    res.status(500).json({ error: "Failed to generate coaching" });
  }
});

export default router;
