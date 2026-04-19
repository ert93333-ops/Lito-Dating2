/**
 * ws.ts
 *
 * WebSocket gateway — thin protocol layer.
 *
 * Responsibilities:
 *  - JWT auth from query param
 *  - Room join/leave management with participant authorization
 *  - Routing incoming WS messages to the appropriate service
 *  - Broadcasting saved messages back to room members
 *  - Scheduling async interest analysis (fire-and-forget, never blocks chat)
 *  - Viewer-scoped prs_update delivery
 *
 * What this file does NOT do:
 *  - DB queries (delegated to chatService / participantRepository)
 *  - Business logic (delegated to chatService)
 *  - Scoring or LLM calls (delegated to interest.worker via setImmediate)
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { chatService } from "./modules/chat/chat.service.js";
import { participantRepository } from "./modules/interest/participant.repository.js";
import { schedule as scheduleInterest, registerBroadcast } from "./modules/interest/interest.worker.js";
import { db, matchesTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";

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

/**
 * Viewer-scoped broadcast — sends only to the socket belonging to viewerUserId.
 * Prevents PRS_AB from leaking to participant B.
 */
function broadcastToViewer(
  conversationId: string,
  viewerUserId: number,
  payload: unknown
): void {
  const room = rooms.get(conversationId);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.userId === viewerUserId && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

/**
 * Resolve and authorize a user's membership in a conversation.
 *
 * Order:
 *  1. Check conversation_participants table
 *  2. Backfill from matches table if conversationId is numeric (matchId)
 *  3. Backfill from distinct non-null senderUserId (legacy conversations)
 *
 * Returns true if user is a valid participant (and seeds the table if needed).
 */
async function authorizeAndSeedParticipant(
  conversationId: string,
  userId: number
): Promise<boolean> {
  if (await participantRepository.isParticipant(conversationId, userId)) {
    return true;
  }

  if (/^\d+$/.test(conversationId)) {
    const matchId = parseInt(conversationId, 10);
    try {
      const [match] = await db
        .select()
        .from(matchesTable)
        .where(
          and(
            eq(matchesTable.id, matchId),
            or(
              eq(matchesTable.user1Id, userId),
              eq(matchesTable.user2Id, userId)
            )
          )
        )
        .limit(1);

      if (match) {
        await participantRepository.seedParticipants(
          conversationId,
          [match.user1Id, match.user2Id],
          "match_accept"
        );
        return true;
      }
    } catch (err) {
      console.error("[ws] match backfill error:", err);
    }
  }

  try {
    const messages = await chatService.getMessages(conversationId);
    const senderIds = [
      ...new Set(
        messages
          .map((m) => m.senderUserId)
          .filter((id): id is number => id !== null && id !== undefined)
      ),
    ];

    if (senderIds.includes(userId) && senderIds.length <= 2) {
      await participantRepository.seedParticipants(
        conversationId,
        senderIds,
        "backfill_chat"
      );
      return true;
    }
  } catch (err) {
    console.error("[ws] chat backfill error:", err);
  }

  return false;
}

// ── Setup ──────────────────────────────────────────────────────────────────────

export function setupWebSocket(wss: WebSocketServer) {
  registerBroadcast(broadcastToViewer);

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

        if (!ws.userId) {
          ws.send(JSON.stringify({
            type: "error",
            error: "인증이 필요합니다.",
          }));
          return;
        }

        try {
          const allowed = await authorizeAndSeedParticipant(conversationId, ws.userId);
          if (!allowed) {
            console.warn(`[ws] unauthorized join attempt userId=${ws.userId} conv=${conversationId}`);
            ws.send(JSON.stringify({
              type: "error",
              error: "이 대화에 참여할 권한이 없습니다.",
            }));
            return;
          }
        } catch (err) {
          console.error("[ws] join auth error:", err);
          ws.send(JSON.stringify({ type: "error", error: "서버 오류" }));
          return;
        }

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
        if (!ws.userId) {
          ws.send(JSON.stringify({
            type: "error",
            error: "메시지를 보내려면 로그인이 필요합니다.",
          }));
          return;
        }

        const conversationId = msg["conversationId"] as string;
        const content = msg["content"] as string;
        const senderId = msg["senderId"] as string;
        const originalLanguage = (msg["originalLanguage"] as string) ?? "ko";

        if (!conversationId || !content || !senderId) return;

        try {
          const saved = await chatService.sendMessage({
            conversationId,
            senderUserId: ws.userId,
            senderId,
            content,
            originalLanguage,
          });

          broadcast(conversationId, JSON.stringify({ type: "message", conversationId, message: saved }));

          setImmediate(() => {
            scheduleInterest(conversationId, saved.id);
          });
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
