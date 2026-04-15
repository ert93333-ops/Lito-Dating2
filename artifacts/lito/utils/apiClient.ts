/**
 * API 클라이언트 유틸리티
 * - HTTP 상태코드별 분기 처리 (401/403/429)
 * - 자동 재시도 (지수 백오프)
 * - 네트워크 에러 래핑
 */

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

// ── 커스텀 에러 클래스 ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: string
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export class NetworkError extends Error {
  constructor(public readonly originalError: unknown) {
    super("네트워크 연결을 확인해주세요.");
    this.name = "NetworkError";
  }
}

// ── 재시도 설정 ────────────────────────────────────────────────────────────────

interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  retryOn?: number[];
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  retryOn: [429, 500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 메인 API 호출 함수 ─────────────────────────────────────────────────────────

interface ApiFetchOptions extends RequestInit {
  token?: string | null;
  retry?: RetryConfig | false;
}

/**
 * API 호출 래퍼.
 * - 자동으로 API_BASE를 붙여줍니다.
 * - 401/403/429 등 상태코드별 ApiError를 throw합니다.
 * - 네트워크 실패 시 NetworkError를 throw합니다.
 * - 429/5xx 에러 시 지수 백오프로 자동 재시도합니다.
 *
 * @param path - API 경로 (예: "/api/auth/me")
 * @param options - fetch 옵션 + token, retry 설정
 */
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { token, retry: retryOpt, ...fetchInit } = options;

  // Authorization 헤더 자동 주입
  const headers = new Headers(fetchInit.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const retryConfig = retryOpt === false ? null : { ...DEFAULT_RETRY, ...retryOpt };
  const maxAttempts = retryConfig ? retryConfig.maxRetries! + 1 : 1;
  const url = `${API_BASE}${path}`;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { ...fetchInit, headers });

      if (res.ok) return res;

      // 재시도 가능한 상태코드인지 확인
      if (
        retryConfig &&
        retryConfig.retryOn!.includes(res.status) &&
        attempt < maxAttempts - 1
      ) {
        // 429의 경우 Retry-After 헤더 존중
        const retryAfter = res.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : retryConfig.baseDelayMs! * Math.pow(2, attempt);
        await sleep(delayMs);
        continue;
      }

      // 재시도 불가 → ApiError throw
      const body = await res.text().catch(() => "");
      throw new ApiError(res.status, res.statusText, body);
    } catch (err) {
      if (err instanceof ApiError) throw err;

      // 네트워크 에러 (fetch 자체 실패)
      lastError = err;
      if (retryConfig && attempt < maxAttempts - 1) {
        await sleep(retryConfig.baseDelayMs! * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw new NetworkError(lastError);
}

/**
 * JSON 응답을 자동 파싱하는 편의 함수.
 */
export async function apiFetchJson<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const res = await apiFetch(path, options);
  return res.json() as Promise<T>;
}

export { API_BASE };
