/**
 * routes/index.ts
 *
 * Central router — assembles all module routers into the Express app.
 *
 * Module ownership:
 *  chat/     — message CRUD (GET, POST, DELETE /api/chat/:id/messages)
 *  interest/ — PRS scoring (/api/ai/prs) + admin analytics endpoints
 *  coaching/ — AI language features (/api/ai/coach, /suggest-reply, /translate, etc.)
 *  match/    — discover feed, swipe (like/pass), matches, single user lookup
 *  reports/  — user reports + blocks
 *
 * Auth, storage, social auth, oauth, and legal routes are stable and remain
 * as direct route files until they grow large enough to warrant a full module.
 */

import path from "path";
import { Router, type IRouter } from "express";

// ── Modular routers ────────────────────────────────────────────────────────────
import chatRouter         from "../modules/chat/chat.router.js";
import interestRouter     from "../modules/interest/interest.router.js";
import coachingRouter     from "../modules/coaching/coaching.router.js";
import matchRouter        from "../modules/match/match.router.js";
import reportsRouter      from "../modules/reports/reports.router.js";
import notificationRouter from "../modules/notification/notification.router.js";
import contactRouter      from "../modules/contact/contact.router.js";
import onboardingRouter   from "../modules/onboarding/onboarding.router.js";
import aiConsentsRouter   from "../modules/ai_consents/ai_consents.router.js";
import billingRouter      from "../modules/billing/billing.router.js";
import deletionRouter     from "../modules/deletion/deletion.router.js";
import translationsRouter from "../modules/translations/translations.router.js";
import profileCoachRouter from "../modules/profile_coach/profile_coach.router.js";
import adminRouter        from "../modules/admin/admin.router.js";

// ── Stable route files (not yet split into full modules) ─────────────────────
import healthRouter      from "./health.js";
import authRouter        from "./auth.js";
import storageRouter     from "./storage.js";
import socialAuthRouter  from "./socialAuth.js";
import oauthCallbackRouter from "./oauthCallback.js";
import legalRouter       from "./legal.js";

const router: IRouter = Router();

// ── Core feature modules ──────────────────────────────────────────────────────
router.use(chatRouter);
router.use(interestRouter);
router.use(coachingRouter);
router.use(matchRouter);
router.use(reportsRouter);
router.use(notificationRouter);
router.use(contactRouter);

// ── v1 모듈 (MASTER INSTRUCTION 기준 신규) ────────────────────────────────────
router.use(onboardingRouter);
router.use(aiConsentsRouter);
router.use(billingRouter);
router.use(deletionRouter);
router.use(translationsRouter);
router.use(profileCoachRouter);
router.use(adminRouter);

// ── Infrastructure & auth routes ──────────────────────────────────────────────
router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(socialAuthRouter);
router.use(oauthCallbackRouter);
router.use(legalRouter);

router.get("/download/lito-docs", (_req, res) => {
  const filePath = path.resolve(process.cwd(), "../../lito_docs_all.docx");
  res.download(filePath, "lito_docs_all.docx");
});

export default router;
