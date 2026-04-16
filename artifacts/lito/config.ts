/**
 * LITO 앱 중앙 설정
 *
 * 모든 환경 의존 값을 이 파일에서 관리합니다.
 * Expo는 빌드 타임에 EXPO_PUBLIC_ 접두사 환경변수를 번들에 인라인합니다.
 *
 * 사용법:
 *   import { API_BASE, WS_URL, ENABLE_AI_PERSONAS } from "@/config";
 */

// ── API 서버 ──────────────────────────────────────────────────────────────────

/** HTTP API 기본 URL (trailing slash 없음) */
export const API_BASE: string = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

/** WebSocket URL */
export const WS_URL: string = process.env.EXPO_PUBLIC_DOMAIN
  ? `wss://${process.env.EXPO_PUBLIC_DOMAIN}/ws`
  : "ws://localhost:3000/ws";

// ── Feature Flags ─────────────────────────────────────────────────────────────

/** AI 페르소나 대화방 활성화 여부 (프로덕션에서는 false) */
export const ENABLE_AI_PERSONAS: boolean =
  (process.env.EXPO_PUBLIC_ENABLE_AI_PERSONAS ?? "false").toLowerCase() === "true";

// ── 상수 ──────────────────────────────────────────────────────────────────────

/** 최대 프로필 사진 수 */
export const MAX_PROFILE_PHOTOS = 6;

/** 사진 최대 크기 (bytes) */
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
