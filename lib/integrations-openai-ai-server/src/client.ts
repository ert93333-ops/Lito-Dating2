import OpenAI from "openai";

const apiKey =
  process.env.OPENAI_API_KEY ||
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

const baseURL =
  process.env.OPENAI_API_KEY
    ? "https://api.openai.com/v1"
    : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY must be set. Please add your OpenAI API key as a secret."
  );
}

export const openai = new OpenAI({ apiKey, baseURL });
