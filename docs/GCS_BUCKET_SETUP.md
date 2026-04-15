# GCS 버킷 설정 가이드

LITO Dating 앱의 프로필 사진 업로드를 위한 Google Cloud Storage 설정 가이드입니다.

---

## 1. GCS 버킷 생성

```bash
# gcloud CLI 설치 후 로그인
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 버킷 생성 (아시아 리전 권장)
gsutil mb -l asia-northeast3 gs://lito-dating-uploads

# CORS 설정 (클라이언트에서 직접 PUT 업로드를 위해 필수)
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set cors.json gs://lito-dating-uploads
```

## 2. Service Account 생성 및 키 발급

```bash
# Service Account 생성
gcloud iam service-accounts create lito-storage \
  --display-name="LITO Storage Service Account"

# 버킷 권한 부여 (Storage Object Admin)
gsutil iam ch \
  serviceAccount:lito-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
  gs://lito-dating-uploads

# Signed URL 생성을 위한 추가 권한
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:lito-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# JSON 키 파일 다운로드
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account=lito-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## 3. 환경변수 설정

API 서버의 `.env` 파일에 다음을 추가합니다:

```env
# GCS 설정
GCS_BUCKET_NAME=lito-dating-uploads
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcs-key.json

# 또는 Railway/Cloud Run 등에서는 JSON 내용을 직접 환경변수로 설정
# GCS_KEY_JSON={"type":"service_account","project_id":"..."}
```

| 환경변수 | 필수 | 설명 |
|---------|------|------|
| `GCS_BUCKET_NAME` | **필수** | GCS 버킷 이름 |
| `GOOGLE_APPLICATION_CREDENTIALS` | 권장 | Service Account JSON 키 파일 경로 |
| `API_BASE_URL` | 선택 | 로컬 모드에서 업로드 URL 생성용 (기본: `http://localhost:8080`) |

## 4. 동작 모드

### GCS 모드 (프로덕션)

`GCS_BUCKET_NAME`이 설정되면 자동으로 GCS 모드로 동작합니다.

```
클라이언트 → POST /api/storage/uploads/request-url (JWT 필수)
         ← { uploadURL: "https://storage.googleapis.com/...(signed)", objectPath: "/objects/uploads/uuid" }

클라이언트 → PUT uploadURL (직접 GCS에 업로드)
         ← 200 OK

클라이언트 → 프로필에 objectPath 저장
서빙     → GET /api/storage/objects/uploads/uuid → GCS에서 스트리밍
```

### 로컬 모드 (개발)

`GCS_BUCKET_NAME`이 미설정이면 로컬 파일시스템(`./uploads/`)에 저장됩니다.

```
클라이언트 → POST /api/storage/uploads/request-url (JWT 필수)
         ← { uploadURL: "http://localhost:8080/api/storage/local-upload/uuid", objectPath: "/objects/uploads/uuid" }

클라이언트 → PUT uploadURL (서버에 직접 업로드)
         ← 200 OK

서빙     → GET /api/storage/objects/uploads/uuid → 로컬 파일에서 스트리밍
```

## 5. 보안 설정

### 버킷 공개 접근 차단

```bash
# 버킷 레벨에서 공개 접근 차단 (Signed URL로만 접근)
gsutil pap set enforced gs://lito-dating-uploads
```

### 파일 크기 제한

API 서버에서 10MB 제한이 적용됩니다 (413 응답).

### 허용 파일 형식

JPEG, PNG, GIF, WebP만 허용됩니다 (400 응답).

## 6. 검증

```bash
# API 서버 시작 후 테스트
# 1. JWT 토큰 획득
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","nickname":"test"}' \
  | jq -r '.token')

# 2. 업로드 URL 요청
curl -s -X POST http://localhost:8080/api/storage/uploads/request-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"test.jpg","size":1024,"contentType":"image/jpeg"}'

# 3. 파일 업로드 (로컬 모드)
curl -X PUT http://localhost:8080/api/storage/local-upload/UUID \
  -H "Content-Type: image/jpeg" \
  --data-binary @test.jpg

# 4. 파일 서빙 확인
curl -I http://localhost:8080/api/storage/objects/uploads/UUID
```
