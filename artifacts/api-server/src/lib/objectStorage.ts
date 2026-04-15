/**
 * Object Storage 서비스
 *
 * GCS(Google Cloud Storage) 기반 파일 업로드/다운로드/서빙.
 * 두 가지 모드를 지원합니다:
 *
 * 1. **GCS 모드** (프로덕션): GCS_BUCKET_NAME + GOOGLE_APPLICATION_CREDENTIALS 환경변수 필요
 * 2. **로컬 모드** (개발): GCS 미설정 시 로컬 파일시스템(`./uploads/`)에 저장
 *
 * Replit 사이드카 의존성을 완전히 제거했습니다.
 */

import { Storage, File, Bucket } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

// ── GCS 클라이언트 초기화 ────────────────────────────────────────────────────

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || "";
const GCS_KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";

let gcsStorage: Storage | null = null;
let gcsBucket: Bucket | null = null;

if (GCS_BUCKET_NAME) {
  const storageOpts: ConstructorParameters<typeof Storage>[0] = {};
  if (GCS_KEY_FILE) {
    storageOpts.keyFilename = GCS_KEY_FILE;
  }
  // GOOGLE_APPLICATION_CREDENTIALS가 없으면 ADC(Application Default Credentials) 사용
  gcsStorage = new Storage(storageOpts);
  gcsBucket = gcsStorage.bucket(GCS_BUCKET_NAME);
  console.log(`[ObjectStorage] GCS 모드: bucket=${GCS_BUCKET_NAME}`);
} else {
  console.log("[ObjectStorage] 로컬 모드: ./uploads/ 디렉토리 사용");
}

// ── 로컬 파일시스템 폴백 ──────────────────────────────────────────────────────

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function ensureLocalDir(): void {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

// ── 에러 클래스 ────────────────────────────────────────────────────────────────

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// ── 메인 서비스 ────────────────────────────────────────────────────────────────

export class ObjectStorageService {
  private isGCS: boolean;

  constructor() {
    this.isGCS = !!gcsBucket;
  }

  /**
   * 업로드용 presigned PUT URL을 생성합니다.
   *
   * - GCS 모드: GCS signed URL 반환 (15분 유효)
   * - 로컬 모드: 로컬 업로드 엔드포인트 URL 반환
   *
   * @returns { uploadURL, objectPath }
   */
  async getUploadURL(contentType?: string): Promise<{
    uploadURL: string;
    objectPath: string;
  }> {
    const objectId = randomUUID();
    const objectPath = `/objects/uploads/${objectId}`;

    if (this.isGCS && gcsBucket) {
      const file = gcsBucket.file(`uploads/${objectId}`);
      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000, // 15분
        contentType: contentType || "application/octet-stream",
      });
      return { uploadURL: signedUrl, objectPath };
    }

    // 로컬 모드: 서버 자체 엔드포인트로 업로드
    ensureLocalDir();
    const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return {
      uploadURL: `${API_BASE}/api/storage/local-upload/${objectId}`,
      objectPath,
    };
  }

  /**
   * 기존 호환성을 위한 래퍼 (getObjectEntityUploadURL 대체)
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const { uploadURL } = await this.getUploadURL();
    return uploadURL;
  }

  /**
   * 오브젝트 경로를 정규화합니다.
   * GCS signed URL → /objects/uploads/uuid 형태로 변환.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // 이미 정규화된 경로
    if (rawPath.startsWith("/objects/")) return rawPath;

    // GCS signed URL에서 경로 추출
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      try {
        const url = new URL(rawPath);
        const pathParts = url.pathname.split("/");
        // /{bucket}/uploads/{uuid} → /objects/uploads/{uuid}
        const uploadsIdx = pathParts.indexOf("uploads");
        if (uploadsIdx >= 0) {
          return `/objects/${pathParts.slice(uploadsIdx).join("/")}`;
        }
      } catch {
        // URL 파싱 실패 시 원본 반환
      }
    }

    // 로컬 업로드 URL에서 경로 추출
    const localMatch = rawPath.match(/\/api\/storage\/local-upload\/([a-f0-9-]+)/);
    if (localMatch) {
      return `/objects/uploads/${localMatch[1]}`;
    }

    return rawPath;
  }

  /**
   * 오브젝트 파일을 가져옵니다 (다운로드/서빙용).
   */
  async getObjectEntityFile(objectPath: string): Promise<File | string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.replace(/^\/objects\//, "");

    if (this.isGCS && gcsBucket) {
      const file = gcsBucket.file(entityId);
      const [exists] = await file.exists();
      if (!exists) throw new ObjectNotFoundError();
      return file;
    }

    // 로컬 모드
    const localPath = path.join(LOCAL_UPLOAD_DIR, entityId);
    if (!fs.existsSync(localPath)) throw new ObjectNotFoundError();
    return localPath;
  }

  /**
   * 오브젝트를 다운로드하여 Response로 반환합니다.
   */
  async downloadObject(fileOrPath: File | string, cacheTtlSec: number = 3600): Promise<Response> {
    if (typeof fileOrPath === "string") {
      // 로컬 파일
      const stat = fs.statSync(fileOrPath);
      const stream = fs.createReadStream(fileOrPath);
      const webStream = Readable.toWeb(stream) as ReadableStream;

      // 확장자에서 Content-Type 추론
      const ext = path.extname(fileOrPath).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };

      return new Response(webStream, {
        headers: {
          "Content-Type": mimeMap[ext] || "application/octet-stream",
          "Content-Length": String(stat.size),
          "Cache-Control": `public, max-age=${cacheTtlSec}`,
        },
      });
    }

    // GCS File
    const [metadata] = await fileOrPath.getMetadata();
    const nodeStream = fileOrPath.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  /**
   * 공개 오브젝트를 검색합니다 (public-objects 라우트용).
   */
  async searchPublicObject(filePath: string): Promise<File | string | null> {
    if (this.isGCS && gcsBucket) {
      const file = gcsBucket.file(filePath);
      const [exists] = await file.exists();
      return exists ? file : null;
    }

    // 로컬 모드
    const localPath = path.join(LOCAL_UPLOAD_DIR, filePath);
    return fs.existsSync(localPath) ? localPath : null;
  }

  /**
   * 로컬 모드에서 파일을 저장합니다.
   */
  async saveLocalFile(objectId: string, data: Buffer, contentType?: string): Promise<void> {
    ensureLocalDir();
    const uploadsDir = path.join(LOCAL_UPLOAD_DIR, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, objectId), data);
  }

  /**
   * 오브젝트를 삭제합니다.
   */
  async deleteObject(objectPath: string): Promise<void> {
    if (!objectPath.startsWith("/objects/")) return;
    const entityId = objectPath.replace(/^\/objects\//, "");

    if (this.isGCS && gcsBucket) {
      try {
        await gcsBucket.file(entityId).delete();
      } catch {
        // 이미 삭제된 경우 무시
      }
      return;
    }

    // 로컬 모드
    const localPath = path.join(LOCAL_UPLOAD_DIR, entityId);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
}

// 싱글톤 export
export const storageService = new ObjectStorageService();
