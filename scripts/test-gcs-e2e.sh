#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GCS E2E 검증 스크립트
# 사용법: GCS_BUCKET_NAME=xxx GCS_SERVICE_ACCOUNT_KEY_PATH=xxx ./scripts/test-gcs-e2e.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
TEST_EMAIL="gcs-e2e-test-$(date +%s)@test.com"
TEST_PASSWORD="test1234"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; FAILURES=$((FAILURES+1)); }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

FAILURES=0

echo "============================================"
echo "  LITO GCS E2E 검증 스크립트"
echo "  API: $API_BASE"
echo "============================================"
echo ""

# ── Step 1: 계정 생성 + 로그인 ─────────────────────────────────────────────
info "Step 1: 테스트 계정 생성 및 로그인"
REG=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  fail "로그인 실패 — TOKEN 없음"
  echo "$LOGIN"
  exit 1
fi
pass "로그인 성공 (TOKEN: ${TOKEN:0:20}...)"

# ── Step 2: Presigned URL 요청 ─────────────────────────────────────────────
info "Step 2: Presigned URL 요청 (image/jpeg)"
PRESIGN=$(curl -s -X POST "$API_BASE/api/storage/uploads/request-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"test-photo.jpg","contentType":"image/jpeg","size":2048}')

UPLOAD_URL=$(echo "$PRESIGN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uploadURL','') or d.get('uploadUrl',''))" 2>/dev/null)
OBJECT_PATH=$(echo "$PRESIGN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('objectPath',''))" 2>/dev/null)

if [ -z "$UPLOAD_URL" ] || [ -z "$OBJECT_PATH" ]; then
  fail "Presigned URL 생성 실패"
  echo "$PRESIGN"
  exit 1
fi
pass "Presigned URL 생성 성공"
info "  uploadUrl: ${UPLOAD_URL:0:80}..."
info "  objectPath: $OBJECT_PATH"

# ── Step 3: 파일 업로드 ────────────────────────────────────────────────────
info "Step 3: 테스트 파일 업로드 (2KB dummy JPEG)"

# 더미 JPEG 파일 생성
TMPFILE=$(mktemp /tmp/lito-test-XXXXX.jpg)
dd if=/dev/urandom bs=2048 count=1 of="$TMPFILE" 2>/dev/null

UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@$TMPFILE")

if [ "$UPLOAD_STATUS" = "200" ] || [ "$UPLOAD_STATUS" = "201" ] || [ "$UPLOAD_STATUS" = "204" ]; then
  pass "파일 업로드 성공 (HTTP $UPLOAD_STATUS)"
else
  fail "파일 업로드 실패 (HTTP $UPLOAD_STATUS)"
fi

# ── Step 4: 파일 서빙 확인 ─────────────────────────────────────────────────
info "Step 4: 업로드된 파일 서빙 확인"
SERVE_URL="$API_BASE/api/storage$OBJECT_PATH"
SERVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVE_URL")

if [ "$SERVE_STATUS" = "200" ]; then
  pass "파일 서빙 성공 (HTTP $SERVE_STATUS)"
else
  fail "파일 서빙 실패 (HTTP $SERVE_STATUS, URL: $SERVE_URL)"
fi

# ── Step 5: 프로필에 photos 저장 ───────────────────────────────────────────
info "Step 5: 프로필에 photos 배열 저장"
PHOTO_URL="$API_BASE/api/storage$OBJECT_PATH"
PUT_RESP=$(curl -s -X PUT "$API_BASE/api/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"nickname\":\"GCS-Test\",\"age\":25,\"bio\":\"test\",\"photos\":[\"$PHOTO_URL\"],\"languageLevel\":\"beginner\"}")

PUT_PHOTOS=$(echo "$PUT_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('profile',{}).get('photos',[])))" 2>/dev/null)
if [ "$PUT_PHOTOS" = "1" ]; then
  pass "프로필 photos 저장 성공"
else
  fail "프로필 photos 저장 실패"
  echo "$PUT_RESP"
fi

# ── Step 6: 프로필 조회 (round-trip) ───────────────────────────────────────
info "Step 6: GET /api/auth/me → photos round-trip 확인"
ME=$(curl -s "$API_BASE/api/auth/me" -H "Authorization: Bearer $TOKEN")
ME_PHOTOS=$(echo "$ME" | python3 -c "import sys,json; photos=json.load(sys.stdin).get('profile',{}).get('photos',[]); print(len(photos), photos[0] if photos else '')" 2>/dev/null)

if echo "$ME_PHOTOS" | grep -q "^1 "; then
  pass "photos round-trip 성공: $ME_PHOTOS"
else
  fail "photos round-trip 실패"
  echo "$ME"
fi

# ── Step 7: 파일 삭제 ──────────────────────────────────────────────────────
info "Step 7: 파일 삭제"
DEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_BASE/api/storage$OBJECT_PATH" \
  -H "Authorization: Bearer $TOKEN")

if [ "$DEL_STATUS" = "200" ]; then
  pass "파일 삭제 성공 (HTTP $DEL_STATUS)"
else
  fail "파일 삭제 실패 (HTTP $DEL_STATUS)"
fi

# ── Step 8: 삭제 후 서빙 404 확인 ──────────────────────────────────────────
info "Step 8: 삭제 후 404 확인"
GONE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVE_URL")

if [ "$GONE_STATUS" = "404" ]; then
  pass "삭제 후 404 확인 성공"
else
  fail "삭제 후 404 확인 실패 (HTTP $GONE_STATUS)"
fi

# ── 정리 ───────────────────────────────────────────────────────────────────
rm -f "$TMPFILE"

echo ""
echo "============================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "  ${GREEN}모든 테스트 통과 (8/8)${NC}"
else
  echo -e "  ${RED}실패: $FAILURES건${NC}"
fi
echo "============================================"
exit $FAILURES
