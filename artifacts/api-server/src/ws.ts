import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { and, eq, sql } from "drizzle-orm";
import { db, chatMessages } from "@workspace/db";

// 인증된 WebSocket 타입
interface AuthenticatedWS extends WebSocket {
  userId?: number;
  conversations: Set<string>;
}

// 대화방 → 접속 중인 클라이언트 세트
const rooms = new Map<string, Set<AuthenticatedWS>>();

// 토큰에서 userId 추출 (실패시 undefined)
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

// 방 정리 - 닫힌 소켓 제거
function cleanRoom(conversationId: string, ws: AuthenticatedWS) {
  const room = rooms.get(conversationId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(conversationId);
}

// 방 브로드캐스트 - 연결된 모든 클라이언트에게 전송
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

export function setupWebSocket(wss: WebSocketServer) {
  wss.on("connection", (rawWs: WebSocket, req: IncomingMessage) => {
    const ws = rawWs as AuthenticatedWS;
    ws.conversations = new Set();

    // JWT 인증 (쿼리 파라미터 token=...)
    const url = new URL(req.url ?? "/", "ws://localhost");
    const token = url.searchParams.get("token");
    ws.userId = extractUserId(token);

    ws.on("message", async (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString()) as Record<string, unknown>;
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
        return;
      }

      const type = msg["type"] as string;

      // ── 대화방 입장 ──────────────────────────────────────────────────────
      if (type === "join") {
        const conversationId = msg["conversationId"] as string;
        if (!conversationId) return;

        ws.conversations.add(conversationId);
        if (!rooms.has(conversationId)) rooms.set(conversationId, new Set());
        rooms.get(conversationId)!.add(ws);

        ws.send(JSON.stringify({ type: "joined", conversationId }));
        return;
      }

      // ── 대화방 퇴장 ──────────────────────────────────────────────────────
      if (type === "leave") {
        const conversationId = msg["conversationId"] as string;
        if (!conversationId) return;
        ws.conversations.delete(conversationId);
        cleanRoom(conversationId, ws);
        return;
      }

      // ── 메시지 전송 ──────────────────────────────────────────────────────
      if (type === "message") {
        const conversationId = msg["conversationId"] as string;
        const content = msg["content"] as string;
        const senderId = msg["senderId"] as string;
        const originalLanguage = (msg["originalLanguage"] as string) ?? "ko";

        if (!conversationId || !content || !senderId) return;

        try {
          // DB에 저장
          const [saved] = await db
            .insert(chatMessages)
            .values({
              conversationId,
              senderUserId: ws.userId ?? null,
              senderId,
              content,
              originalLanguage,
            })
            .returning();

          const outbound = JSON.stringify({
            type: "message",
            conversationId,
            message: saved,
          });

          // 같은 방의 모든 클라이언트에게 브로드캐스트 (발신자 포함)
          broadcast(conversationId, outbound);
        } catch (err) {
          console.error("[WS] DB save error:", err);
          ws.send(JSON.stringify({ type: "error", error: "메시지 저장 실패" }));
        }
        return;
      }

       // ── 읽음 표시 (카카오톡 스타일 '1' 실시간 업데이트) ──────────────────
      if (type === "read") {
        const conversationId = msg["conversationId"] as string;
        if (!conversationId || !ws.userId) return;

        try {
          const now = new Date();
          const updated = await db
            .update(chatMessages)
            .set({ readAt: now })
            .where(
              and(
                eq(chatMessages.conversationId, conversationId),
                sql`${chatMessages.senderUserId} != ${ws.userId}`,
                sql`${chatMessages.readAt} IS NULL`
              )
            )
            .returning({ id: chatMessages.id });

          if (updated.length > 0) {
            const readReceipt = JSON.stringify({
              type: "read_receipt",
              conversationId,
              readBy: ws.userId,
              readAt: now.toISOString(),
              messageIds: updated.map((m) => m.id),
            });
            // 같은 방의 모든 클라이언트에게 읽음 상태 브로드캐스트
            broadcast(conversationId, readReceipt);
          }
        } catch (err) {
          console.error("[WS] read receipt error:", err);
        }
        return;
      }

      // ── 핑/퉁 ──────────────────────────────────────────────────────────
      if (type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }}
    });

    ws.on("close", () => {
      ws.conversations.forEach((convId) => cleanRoom(convId, ws));
      ws.conversations.clear();
    });

    ws.on("error", (err) => {
      console.error("[WS] socket error:", err);
    });

    // 연결 확인 메시지
    ws.send(
      JSON.stringify({
        type: "connected",
        userId: ws.userId ?? null,
      })
    );
  });
}
