/**
 * modules/user/user.router.ts
 *
 * HTTP transport layer for user profile endpoints.
 * Auth endpoints (register, login, /me, profile update) stay in the auth module.
 * This router handles public user profile reads.
 *
 * Note: discover, like, pass, match endpoints live in match.router.ts.
 */

import { Router } from "express";

const router = Router();

// This module currently serves as a placeholder for future user-specific routes
// (e.g. GET /users/me/trust-profile, GET /users/me/settings).
// Discover + swipe + match endpoints have been moved to match.router.ts.
// Auth endpoints (register, login, /auth/me, /auth/profile) remain in auth routes.

export default router;
