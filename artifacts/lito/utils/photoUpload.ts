/**
 * Expo용 사진 Object Storage 업로드 유틸리티
 * file:// URI, data: URI, content:// URI 모두 지원
 */

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

/** 파일 확장자에서 MIME 타입 추출 */
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

/** 파일명 생성 */
function getFilename(uri: string, mimeType: string): string {
  const ext = mimeType.split("/")[1] ?? "jpg";
  return `photo_${Date.now()}.${ext}`;
}

/**
 * 사진 URI를 Object Storage에 업로드합니다.
 * @param fileUri - ImagePicker가 반환한 URI (file://, data:, content://)
 * @param token - JWT 인증 토큰
 * @returns 서빙 URL (예: https://domain/api/storage/objects/uploads/uuid)
 */
export async function uploadPhotoToStorage(
  fileUri: string,
  token: string
): Promise<string> {
  const mimeType = getMimeType(fileUri);
  const filename = getFilename(fileUri, mimeType);

  // 1. URI를 Blob으로 변환 (React Native는 fetch()로 로컬 파일 읽기 지원)
  const fetchResponse = await fetch(fileUri);
  const blob = await fetchResponse.blob();

  // 2. 서버에서 presigned URL 요청
  const urlRes = await fetch(`${API_BASE}/api/storage/uploads/request-url`, {
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
  });

  if (!urlRes.ok) {
    const text = await urlRes.text();
    throw new Error(`presigned URL 요청 실패: ${urlRes.status} ${text}`);
  }

  const { uploadURL, objectPath } = (await urlRes.json()) as {
    uploadURL: string;
    objectPath: string;
  };

  // 3. GCS에 직접 PUT 업로드
  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  });

  if (!uploadRes.ok) {
    throw new Error(`GCS 업로드 실패: ${uploadRes.status}`);
  }

  // 4. 서빙 URL 반환 (https://domain/api/storage/objects/uploads/uuid)
  return `${API_BASE}/api/storage${objectPath}`;
}
