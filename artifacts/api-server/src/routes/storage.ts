import { Router, type Request, type Response } from "express";
import { Readable } from "stream";
import { requireAuth } from "../middleware/auth";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();
const storageService = new ObjectStorageService();

/**
 * POST /api/storage/uploads/request-url
 * JWT 필수. 파일 메타데이터를 받아 업로드 URL을 반환합니다.
 *
 * - GCS 모드: GCS presigned PUT URL 반환
 * - 로컬 모드: 로컬 업로드 엔드포인트 URL 반환
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, size, contentType } = req.body as {
      name?: string;
      size?: number;
      contentType?: string;
    };

    if (!name || !contentType) {
      res.status(400).json({ error: "name과 contentType은 필수입니다." });
      return;
    }

    // 파일 크기 제한 (10MB)
    if (size && size > 10 * 1024 * 1024) {
      res.status(413).json({ error: "파일 크기는 10MB 이하여야 합니다." });
      return;
    }

    // 이미지 타입만 허용
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      res.status(400).json({ error: "허용되지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)" });
      return;
    }

    const { uploadURL, objectPath } = await storageService.getUploadURL(contentType);

    res.json({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    });
  } catch (err) {
    console.error("[storage] request-url error:", err);
    res.status(500).json({ error: "업로드 URL 생성 실패" });
  }
});

/**
 * PUT /api/storage/local-upload/:objectId
 * 로컬 개발 모드 전용 — 파일을 직접 서버에 업로드합니다.
 * GCS 모드에서는 사용되지 않습니다.
 */
router.put("/storage/local-upload/:objectId", async (req: Request, res: Response) => {
  try {
    const objectId = req.params["objectId"] as string;
    if (!objectId || !/^[a-f0-9-]+$/.test(objectId)) {
      res.status(400).json({ error: "잘못된 objectId" });
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);

    if (data.length === 0) {
      res.status(400).json({ error: "빈 파일" });
      return;
    }

    if (data.length > 10 * 1024 * 1024) {
      res.status(413).json({ error: "파일 크기는 10MB 이하여야 합니다." });
      return;
    }

    const contentType = Array.isArray(req.headers["content-type"])
      ? req.headers["content-type"][0]
      : req.headers["content-type"];
    await storageService.saveLocalFile(objectId, data, contentType);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[storage] local-upload error:", err);
    res.status(500).json({ error: "로컬 업로드 실패" });
  }
});

/**
 * DELETE /api/storage/objects/*path
 * JWT 필수. 업로드된 파일을 삭제합니다.
 */
router.delete("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path as string | string[];
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    await storageService.deleteObject(objectPath);
    res.json({ ok: true });
  } catch (err) {
    console.error("[storage] delete error:", err);
    res.status(500).json({ error: "파일 삭제 실패" });
  }
});

/**
 * GET /api/storage/public-objects/*
 * 공개 오브젝트 서빙 (인증 불필요)
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath as string | string[];
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await storageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      return;
    }
    const response = await storageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    res.status(500).json({ error: "파일 서빙 실패" });
  }
});

/**
 * GET /api/storage/objects/*
 * 프라이빗 오브젝트 서빙 (프로필 사진 등)
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path as string | string[];
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await storageService.getObjectEntityFile(objectPath);

    const response = await storageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "오브젝트를 찾을 수 없습니다." });
      return;
    }
    res.status(500).json({ error: "파일 서빙 실패" });
  }
});

export default router;
