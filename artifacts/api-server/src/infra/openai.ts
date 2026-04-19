/**
 * infra/openai.ts
 *
 * Singleton OpenAI client for the entire api-server.
 * All modules import from here — never directly from the integration package.
 *
 * Why singleton:
 *  - Avoids re-initialising the HTTP keep-alive pool on every request.
 *  - Single choke-point for future circuit-breaker / retry wrapper.
 */
export { openai, editImages } from "@workspace/integrations-openai-ai-server";
