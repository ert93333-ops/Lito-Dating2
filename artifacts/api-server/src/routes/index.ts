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
