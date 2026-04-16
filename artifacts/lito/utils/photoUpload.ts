import { API_BASE } from "@/config";
/**
 * Expo용 사진 Object Storage 업로드 유틸리티
 * file:// URI, data: URI, content:// URI 모두 지원
 *
 * 변경 사항 (P0-1 리스크 수정):
 * - 401/403/429 상태코드별 세분화된 에러 메시지
 * - 자동 재시도 (최대 2회, 지수 백오프)
 * - 네트워크 에러 래핑
 */


// ── 에러 클래스 ────────────────────────────────────────────────────────────────

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "UploadError";
  }
}

// ── 유틸 ───────────────────────────────────────────────────────────────────────

function getMimeType(uri: string): string {
  if (uri.startsWith("data:")) {
    const match = uri.match(/^data:([^;]+);/);
    return match?.[1] ?? "image/jpeg";
  }
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function getFilename(_uri: string, mimeType: string): string {
  const ext = mimeType.split("/")[1] ?? "jpg";
  return `photo_${Date.now()}.${ext}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleHttpStatus(res: Response, context: string): void {
  if (res.ok) return;

  switch (res.status) {
    case 401:
      throw new UploadError(
        "로그인이 만료되었습니다. 다시 로그인해주세요.",
        401,
        false
      );
    case 403:
      throw new UploadError(
        "업로드 권한이 없습니다. 플랜을 확인해주세요.",
        403,
        false
      );
    case 429:
      throw new UploadError(
        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        429,
        true
      );
    case 413:
      throw new UploadError(
        "파일 크기가 너무 큽니다. 10MB 이하의 사진을 선택해주세요.",
        413,
        false
      );
    default:
      if (res.status >= 500) {
        throw new UploadError(
          `서버 오류가 발생했습니다 (${context}: ${res.status}). 잠시 후 다시 시도해주세요.`,
          res.status,
          true
        );
      }
      throw new UploadError(
        `${context} 실패: ${res.status} ${res.statusText}`,
        res.status,
        false
      );
  }
}

// ── 재시도 래퍼 ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  context: string
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);

      if (res.ok) return res;

      // 재시도 가능한 에러인지 확인
      const isRetryable = res.status === 429 || res.status >= 500;
      if (isRetryable && attempt < MAX_RETRIES) {
        const retryAfter = res.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delayMs);
        continue;
      }

      handleHttpStatus(res, context);
    } catch (err) {
      if (err instanceof UploadError) throw err;

      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw new UploadError(
    "네트워크 연결을 확인해주세요.",
    undefined,
    true
  );
}

// ── 메인 업로드 함수 ──────────────────────────────────────────────────────────

/**
 * 사진 URI를 Object Storage에 업로드합니다.
 * @param fileUri - ImagePicker가 반환한 URI (file://, data:, content://)
 * @param token - JWT 인증 토큰
 * @returns 서빙 URL (예: https://domain/api/storage/objects/uploads/uuid)
 * @throws {UploadError} 업로드 실패 시 (status, retryable 필드 포함)
 */
export async function uploadPhotoToStorage(
  fileUri: string,
  token: string
): Promise<string> {
  const mimeType = getMimeType(fileUri);
  const filename = getFilename(fileUri, mimeType);

  // 1. URI를 Blob으로 변환
  let blob: Blob;
  try {
    const fetchResponse = await fetch(fileUri);
    blob = await fetchResponse.blob();
  } catch {
    throw new UploadError("사진 파일을 읽을 수 없습니다.", undefined, false);
  }

  // 2. 서버에서 presigned URL 요청 (재시도 포함)
  const urlRes = await fetchWithRetry(
    `${API_BASE}/api/storage/uploads/request-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: filename,
        size: blob.size,
        contentType: mimeType,
      }),
    },
    "presigned URL 요청"
  );

  const { uploadURL, objectPath } = (await urlRes.json()) as {
    uploadURL: string;
    objectPath: string;
  };

  // 3. GCS에 직접 PUT 업로드 (재시도 포함)
  await fetchWithRetry(
    uploadURL,
    {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: blob,
    },
    "스토리지 업로드"
  );

  // 4. 서빙 URL 반환
  return `${API_BASE}/api/storage${objectPath}`;
}
