/**
 * ws.ts
 *
 * WebSocket gateway — thin protocol layer.
 *
 * Responsibilities:
 *  - JWT auth from query param
 *  - Room join/leave management
 *  - Routing incoming WS messages to the appropriate service
 *  - Broadcasting saved messages back to room members
 *
 * What this file does NOT do:
 *  - DB queries (delegated to chatService)
 *  - Business logic (delegated to chatService)
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { chatService } from "./modules/chat/chat.service.js";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuthenticatedWS extends WebSocket {
  userId?: number;
  conversations: Set<string>;
}

// ── Room registry ──────────────────────────────────────────────────────────────

const rooms = new Map<string, Set<AuthenticatedWS>>();

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractUserId(token: string | null): number | undefined {
  if (!token) return undefined;
  try {
    const secret = process.env["SESSION_SECRET"] ?? "dev-secret";
    const payload = jwt.verify(token, secret) as { userId: number };
    return payload.userId;
  } catch {
    return undefined;
  }
}

function cleanRoom(conversationId: string, ws: AuthenticatedWS) {
  const room = rooms.get(conversationId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(conversationId);
}

function broadcast(conversationId: string, payload: string, exclude?: AuthenticatedWS) {
  const room = rooms.get(conversationId);
  if (!room) return;
  for (const client of room) {
    if (client === exclude) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

export function setupWebSocket(wss: WebSocketServer) {
  wss.on("connection", (rawWs: WebSocket, req: IncomingMessage) => {
    const ws = rawWs as AuthenticatedWS;
    ws.conversations = new Set();

    const url = new URL(req.url ?? "/", "ws://localhost");
    ws.userId = extractUserId(url.searchParams.get("token"));

    ws.on("message", async (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString()) as Record<string, unknown>;
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
        return;
      }

      const type = msg["type"] as string;

      // ── join ────────────────────────────────────────────────────────────────
      if (type === "join") {
        const conversationId = msg["conversationId"] as string;
        if (!conversationId) return;
        ws.conversations.add(conversationId);
        if (!rooms.has(conversationId)) rooms.set(conversationId, new Set());
        rooms.get(conversationId)!.add(ws);
        ws.send(JSON.stringify({ type: "joined", conversationId }));
        return;
      }

      // ── leave ───────────────────────────────────────────────────────────────
      if (type === "leave") {
        const conversationId = msg["conversationId"] as string;
        if (!conversationId) return;
        ws.conversations.delete(conversationId);
        cleanRoom(conversationId, ws);
        return;
      }

      // ── message ─────────────────────────────────────────────────────────────
      if (type === "message") {
        const conversationId = msg["conversationId"] as string;
        const content = msg["content"] as string;
        const senderId = msg["senderId"] as string;
        const originalLanguage = (msg["originalLanguage"] as string) ?? "ko";

        if (!conversationId || !content || !senderId) return;

        try {
          // Delegate to chatService — no direct DB call here
          const saved = await chatService.sendMessage({
            conversationId,
            senderUserId: ws.userId ?? null,
            senderId,
            content,
            originalLanguage,
          });

          broadcast(conversationId, JSON.stringify({ type: "message", conversationId, message: saved }));
        } catch (err) {
          console.error("[WS] message save error:", err);
          ws.send(JSON.stringify({ type: "error", error: "메시지 저장 실패" }));
        }
        return;
      }

      // ── ping ────────────────────────────────────────────────────────────────
      if (type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
    });

    ws.on("close", () => {
      ws.conversations.forEach((convId) => cleanRoom(convId, ws));
      ws.conversations.clear();
    });

    ws.on("error", (err) => {
      console.error("[WS] socket error:", err);
    });

    ws.send(JSON.stringify({ type: "connected", userId: ws.userId ?? null }));
  });
}
