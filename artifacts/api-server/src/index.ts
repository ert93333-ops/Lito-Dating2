import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { setupWebSocket } from "./ws";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// HTTP 서버 생성 (Express 앱을 핸들러로 연결)
const server = createServer(app);

// WebSocket 서버를 HTTP 서버에 연결 (noServer 아닌 서버 공유 방식)
const wss = new WebSocketServer({ server, path: "/ws" });
setupWebSocket(wss);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
