/** API 기본 URL — EXPO_PUBLIC_DOMAIN 환경변수로 주입됨 */
export const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";
