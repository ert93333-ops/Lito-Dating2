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

export default router;
