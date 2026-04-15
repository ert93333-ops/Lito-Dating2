import type { Request, Response, NextFunction } from "express";

/**
 * requireAdmin middleware
 *
 * Protects admin-only endpoints by validating a secret token
 * passed via the `x-admin-token` request header.
 *
 * Set ADMIN_TOKEN in your .env file.
 * In production, use a long random string (e.g. openssl rand -hex 32).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    // If ADMIN_TOKEN is not configured, block all admin access
    res.status(503).json({ error: "Admin access is not configured on this server." });
    return;
  }

  const provided = req.headers["x-admin-token"];

  if (!provided || provided !== adminToken) {
    res.status(403).json({ error: "Forbidden: invalid or missing admin token." });
    return;
  }

  next();
}
