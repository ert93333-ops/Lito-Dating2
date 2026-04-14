import { Router, type Request, type Response } from "express";
import { Readable } from "stream";
import { requireAuth } from "../middleware/auth";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();
const storageService = new ObjectStorageService();

/**
 * POST /api/storage/uploads/request-url
 * JWT 필수. 파일 메타데이터를 받아 GCS presigned PUT URL을 반환합니다.
 * 클라이언트는 반환된 URL에 파일을 직접 PUT 업로드합니다.
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

    const uploadURL = await storageService.getObjectEntityUploadURL();
    const objectPath = storageService.normalizeObjectEntityPath(uploadURL);

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
 * 현재는 인증 없이 공개 — 필요시 requireAuth 추가
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
