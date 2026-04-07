export type Country = "KR" | "JP";

export type AccountActionStatus =
  | "active" | "warned" | "restricted" | "shadow_banned" | "suspended" | "permanently_banned";

export type ModerationStatus =
  | "clear" | "pending_review" | "under_review" | "action_taken" | "appealing";

export type VerificationStatus =
  | "not_verified" | "pending_review" | "verified" | "rejected" | "reverify_required";

export type RiskFlagKind =
  | "ai_generated_image" | "identity_mismatch" | "bulk_repetitive_message"
  | "off_platform_lure" | "financial_solicitation" | "multi_account_device" | "repeated_reports";

export type RiskFlagSeverity = "low" | "medium" | "high" | "critical";
export type RiskFlagSource = "automated" | "user_report" | "manual_review";

export type ReportCategory =
  | "fake_profile" | "ai_generated_photos" | "impersonation" | "romance_scam"
  | "financial_scam" | "off_platform_contact" | "spam_messages" | "harassment"
  | "underage" | "other";

export type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned";

export interface RiskFlag {
  kind: RiskFlagKind;
  severity: RiskFlagSeverity;
  source: RiskFlagSource;
  detectedAt: string;
  details?: string;
  resolvedAt?: string;
}

export interface UserReport {
  id: string;
  reporterNickname: string;
  reportedUserId: string;
  category: ReportCategory;
  details?: string;
  submittedAt: string;
  status: ReportStatus;
}

export interface AdminUser {
  id: string;
  nickname: string;
  email: string;
  country: Country;
  age: number;
  joinedAt: string;
  lastActive: string;
  photo: string;
  riskScore: number;
  accountStatus: AccountActionStatus;
  moderationStatus: ModerationStatus;
  verificationStatus: VerificationStatus;
  reportCount: number;
  flags: RiskFlag[];
  receivedReports: UserReport[];
  suspendedUntil?: string;
  appealReason?: string;
}

export interface VerificationEntry {
  id: string;
  userId: string;
  nickname: string;
  country: Country;
  age: number;
  idType: string;
  submittedAt: string;
  status: VerificationStatus;
  photoUrl: string;
  idPhotoUrl: string;
  notes?: string;
}

export interface Appeal {
  id: string;
  userId: string;
  nickname: string;
  country: Country;
  accountStatus: AccountActionStatus;
  actionReason: string;
  appealReason: string;
  submittedAt: string;
  status: "pending" | "approved" | "denied";
  reviewedAt?: string;
  reviewedBy?: string;
}

export const MOCK_USERS: AdminUser[] = [
  {
    id: "u1",
    nickname: "하나미",
    email: "hanami@example.com",
    country: "JP",
    age: 24,
    joinedAt: "2025-11-10",
    lastActive: "2026-04-06T14:32:00",
    photo: "https://picsum.photos/seed/u1lito/200",
    riskScore: 8,
    accountStatus: "active",
    moderationStatus: "clear",
    verificationStatus: "verified",
    reportCount: 0,
    flags: [],
    receivedReports: [],
  },
  {
    id: "u2",
    nickname: "김민준",
    email: "minjun2k@example.com",
    country: "KR",
    age: 28,
    joinedAt: "2025-12-01",
    lastActive: "2026-04-07T09:12:00",
    photo: "https://picsum.photos/seed/u2lito/200",
    riskScore: 84,
    accountStatus: "restricted",
    moderationStatus: "under_review",
    verificationStatus: "not_verified",
    reportCount: 7,
    flags: [
      { kind: "financial_solicitation", severity: "high", source: "automated", detectedAt: "2026-04-05", details: "암호화폐 투자 유도 메시지 3개 감지" },
      { kind: "repeated_reports", severity: "high", source: "user_report", detectedAt: "2026-04-06", details: "7명의 고유 신고자로부터 신고 수신" },
      { kind: "off_platform_lure", severity: "medium", source: "automated", detectedAt: "2026-04-04", details: "텔레그램 이동 요청 키워드 감지" },
    ],
    receivedReports: [
      { id: "r1", reporterNickname: "사쿠라모토", reportedUserId: "u2", category: "financial_scam", details: "투자 앱 설치를 요구했습니다.", submittedAt: "2026-04-06T08:00:00", status: "pending" },
      { id: "r2", reporterNickname: "하나미", reportedUserId: "u2", category: "off_platform_contact", details: "텔레그램으로 이동하자고 계속 요청함", submittedAt: "2026-04-05T19:20:00", status: "pending" },
      { id: "r3", reporterNickname: "다나카유이", reportedUserId: "u2", category: "romance_scam", details: "빠른 사랑 고백 후 돈 요청", submittedAt: "2026-04-05T11:30:00", status: "pending" },
    ],
  },
  {
    id: "u3",
    nickname: "사쿠라모토",
    email: "sakuramoto@example.jp",
    country: "JP",
    age: 26,
    joinedAt: "2026-01-15",
    lastActive: "2026-04-07T10:48:00",
    photo: "https://picsum.photos/seed/u3lito/200",
    riskScore: 22,
    accountStatus: "warned",
    moderationStatus: "clear",
    verificationStatus: "pending_review",
    reportCount: 1,
    flags: [
      { kind: "bulk_repetitive_message", severity: "medium", source: "automated", detectedAt: "2026-03-28", details: "유사한 메시지 12회 전송 / 1시간" },
    ],
    receivedReports: [
      { id: "r4", reporterNickname: "이서연", reportedUserId: "u3", category: "spam_messages", details: "같은 내용의 메시지를 계속 보냄", submittedAt: "2026-03-29T09:00:00", status: "reviewed" },
    ],
  },
  {
    id: "u4",
    nickname: "이서연",
    email: "seoyeon@example.com",
    country: "KR",
    age: 27,
    joinedAt: "2025-10-22",
    lastActive: "2026-04-06T22:11:00",
    photo: "https://picsum.photos/seed/u4lito/200",
    riskScore: 3,
    accountStatus: "active",
    moderationStatus: "clear",
    verificationStatus: "verified",
    reportCount: 0,
    flags: [],
    receivedReports: [],
  },
  {
    id: "u5",
    nickname: "다나카유이",
    email: "yui.tanaka@example.jp",
    country: "JP",
    age: 23,
    joinedAt: "2026-02-01",
    lastActive: "2026-04-07T08:55:00",
    photo: "https://picsum.photos/seed/u5lito/200",
    riskScore: 67,
    accountStatus: "suspended",
    moderationStatus: "action_taken",
    verificationStatus: "rejected",
    reportCount: 4,
    suspendedUntil: "2026-04-21",
    flags: [
      { kind: "ai_generated_image", severity: "critical", source: "automated", detectedAt: "2026-04-01", details: "프로필 사진 GAN 생성 가능성 94%" },
      { kind: "identity_mismatch", severity: "high", source: "manual_review", detectedAt: "2026-04-02", details: "신분증 얼굴 사진과 프로필 불일치" },
    ],
    receivedReports: [
      { id: "r5", reporterNickname: "최준서", reportedUserId: "u5", category: "fake_profile", details: "사진이 AI 생성된 것 같습니다.", submittedAt: "2026-04-01T15:00:00", status: "actioned" },
      { id: "r6", reporterNickname: "하나미", reportedUserId: "u5", category: "ai_generated_photos", submittedAt: "2026-04-01T16:20:00", status: "actioned" },
    ],
    appealReason: "제 사진은 진짜입니다. 신분증 재확인을 요청드립니다.",
  },
  {
    id: "u6",
    nickname: "최준서",
    email: "junser@example.com",
    country: "KR",
    age: 31,
    joinedAt: "2025-09-05",
    lastActive: "2026-04-07T11:02:00",
    photo: "https://picsum.photos/seed/u6lito/200",
    riskScore: 15,
    accountStatus: "active",
    moderationStatus: "clear",
    verificationStatus: "verified",
    reportCount: 0,
    flags: [],
    receivedReports: [],
  },
  {
    id: "u7",
    nickname: "스즈키켄",
    email: "ken.suzuki@example.jp",
    country: "JP",
    age: 35,
    joinedAt: "2026-03-01",
    lastActive: "2026-04-06T18:30:00",
    photo: "https://picsum.photos/seed/u7lito/200",
    riskScore: 91,
    accountStatus: "permanently_banned",
    moderationStatus: "action_taken",
    verificationStatus: "rejected",
    reportCount: 12,
    flags: [
      { kind: "financial_solicitation", severity: "critical", source: "automated", detectedAt: "2026-03-15", details: "코인 투자 사기 패턴 감지" },
      { kind: "multi_account_device", severity: "critical", source: "manual_review", detectedAt: "2026-03-16", details: "동일 디바이스에서 3개 계정 운영 확인" },
      { kind: "repeated_reports", severity: "critical", source: "user_report", detectedAt: "2026-03-17", details: "12명의 고유 신고자" },
    ],
    receivedReports: [],
  },
];

export const ALL_REPORTS: UserReport[] = [
  { id: "r1", reporterNickname: "사쿠라모토", reportedUserId: "u2", category: "financial_scam", details: "투자 앱 설치를 요구했습니다.", submittedAt: "2026-04-06T08:00:00", status: "pending" },
  { id: "r2", reporterNickname: "하나미", reportedUserId: "u2", category: "off_platform_contact", details: "텔레그램으로 이동하자고 계속 요청함", submittedAt: "2026-04-05T19:20:00", status: "pending" },
  { id: "r3", reporterNickname: "다나카유이", reportedUserId: "u2", category: "romance_scam", details: "빠른 사랑 고백 후 돈 요청", submittedAt: "2026-04-05T11:30:00", status: "pending" },
  { id: "r4", reporterNickname: "이서연", reportedUserId: "u3", category: "spam_messages", details: "같은 내용의 메시지를 계속 보냄", submittedAt: "2026-03-29T09:00:00", status: "reviewed" },
  { id: "r5", reporterNickname: "최준서", reportedUserId: "u5", category: "fake_profile", details: "사진이 AI 생성된 것 같습니다.", submittedAt: "2026-04-01T15:00:00", status: "actioned" },
  { id: "r6", reporterNickname: "하나미", reportedUserId: "u5", category: "ai_generated_photos", submittedAt: "2026-04-01T16:20:00", status: "actioned" },
  { id: "r7", reporterNickname: "김민준", reportedUserId: "u7", category: "financial_scam", details: "코인 투자 링크를 공유했습니다.", submittedAt: "2026-03-16T10:00:00", status: "actioned" },
  { id: "r8", reporterNickname: "스즈키켄", reportedUserId: "u7", category: "impersonation", submittedAt: "2026-03-17T09:00:00", status: "actioned" },
  { id: "r9", reporterNickname: "이서연", reportedUserId: "u3", category: "harassment", details: "부적절한 메시지를 계속 보냅니다.", submittedAt: "2026-04-07T07:00:00", status: "pending" },
  { id: "r10", reporterNickname: "하나미", reportedUserId: "u1", category: "other", details: "이상한 행동을 보입니다.", submittedAt: "2026-04-07T09:00:00", status: "dismissed" },
];

export const VERIFICATION_QUEUE: VerificationEntry[] = [
  {
    id: "v1",
    userId: "u3",
    nickname: "사쿠라모토",
    country: "JP",
    age: 26,
    idType: "운전면허증",
    submittedAt: "2026-04-06T10:00:00",
    status: "pending_review",
    photoUrl: "https://picsum.photos/seed/v1face/400/300",
    idPhotoUrl: "https://picsum.photos/seed/v1id/400/300",
  },
  {
    id: "v2",
    userId: "u5",
    nickname: "다나카유이",
    country: "JP",
    age: 23,
    idType: "여권",
    submittedAt: "2026-04-02T09:00:00",
    status: "rejected",
    photoUrl: "https://picsum.photos/seed/v2face/400/300",
    idPhotoUrl: "https://picsum.photos/seed/v2id/400/300",
    notes: "얼굴 불일치 — AI 생성 의심",
  },
  {
    id: "v3",
    userId: "u8",
    nickname: "박지수",
    country: "KR",
    age: 25,
    idType: "주민등록증",
    submittedAt: "2026-04-07T06:00:00",
    status: "pending_review",
    photoUrl: "https://picsum.photos/seed/v3face/400/300",
    idPhotoUrl: "https://picsum.photos/seed/v3id/400/300",
  },
  {
    id: "v4",
    userId: "u9",
    nickname: "야마모토아이",
    country: "JP",
    age: 29,
    idType: "마이넘버카드",
    submittedAt: "2026-04-07T08:15:00",
    status: "pending_review",
    photoUrl: "https://picsum.photos/seed/v4face/400/300",
    idPhotoUrl: "https://picsum.photos/seed/v4id/400/300",
  },
];

export const APPEALS: Appeal[] = [
  {
    id: "a1",
    userId: "u5",
    nickname: "다나카유이",
    country: "JP",
    accountStatus: "suspended",
    actionReason: "AI 생성 프로필 사진 의심 + 신분증 불일치",
    appealReason: "제 사진은 진짜입니다. 새 셀카와 신분증을 다시 제출할 수 있습니다. 억울합니다.",
    submittedAt: "2026-04-03T14:00:00",
    status: "pending",
  },
  {
    id: "a2",
    userId: "u_old1",
    nickname: "나카무라료",
    country: "JP",
    accountStatus: "warned",
    actionReason: "스팸 메시지 플래그",
    appealReason: "저는 같은 앱 소개 메시지를 많이 보낸 것은 맞지만 악의는 없었습니다.",
    submittedAt: "2026-04-01T09:00:00",
    status: "approved",
    reviewedAt: "2026-04-02T11:00:00",
    reviewedBy: "mod_01",
  },
  {
    id: "a3",
    userId: "u_old2",
    nickname: "오타쿠레이",
    country: "JP",
    accountStatus: "suspended",
    actionReason: "반복 신고 (5명)",
    appealReason: "신고한 사람들이 저를 아는 사람이라고 의심합니다. 모르는 사람들입니다.",
    submittedAt: "2026-04-04T17:00:00",
    status: "denied",
    reviewedAt: "2026-04-05T10:00:00",
    reviewedBy: "mod_02",
  },
  {
    id: "a4",
    userId: "u_old3",
    nickname: "김현수",
    country: "KR",
    accountStatus: "restricted",
    actionReason: "외부 앱 유도 키워드",
    appealReason: "제가 카카오톡을 언급한 것은 친구를 소개하려 했기 때문입니다. 스캠 의도가 없습니다.",
    submittedAt: "2026-04-06T08:00:00",
    status: "pending",
  },
];

export const RISK_FLAG_QUEUE: Array<{
  id: string;
  userId: string;
  nickname: string;
  country: Country;
  flag: RiskFlag;
  moderationStatus: ModerationStatus;
}> = [
  { id: "f1", userId: "u2", nickname: "김민준", country: "KR", flag: { kind: "financial_solicitation", severity: "high", source: "automated", detectedAt: "2026-04-05", details: "암호화폐 투자 유도 3개 메시지" }, moderationStatus: "under_review" },
  { id: "f2", userId: "u2", nickname: "김민준", country: "KR", flag: { kind: "repeated_reports", severity: "high", source: "user_report", detectedAt: "2026-04-06", details: "7명의 고유 신고자" }, moderationStatus: "under_review" },
  { id: "f3", userId: "u5", nickname: "다나카유이", country: "JP", flag: { kind: "ai_generated_image", severity: "critical", source: "automated", detectedAt: "2026-04-01", details: "GAN 탐지 확률 94%" }, moderationStatus: "action_taken" },
  { id: "f4", userId: "u5", nickname: "다나카유이", country: "JP", flag: { kind: "identity_mismatch", severity: "high", source: "manual_review", detectedAt: "2026-04-02", details: "신분증-얼굴 불일치" }, moderationStatus: "action_taken" },
  { id: "f5", userId: "u7", nickname: "스즈키켄", country: "JP", flag: { kind: "multi_account_device", severity: "critical", source: "manual_review", detectedAt: "2026-03-16", details: "3개 계정 동일 디바이스" }, moderationStatus: "action_taken" },
  { id: "f6", userId: "u3", nickname: "사쿠라모토", country: "JP", flag: { kind: "bulk_repetitive_message", severity: "medium", source: "automated", detectedAt: "2026-03-28", details: "12회 / 1시간 반복 메시지" }, moderationStatus: "clear" },
  { id: "f7", userId: "u_new1", nickname: "이태양", country: "KR", flag: { kind: "off_platform_lure", severity: "medium", source: "automated", detectedAt: "2026-04-07", details: "'라인으로 이동' 키워드 4회" }, moderationStatus: "pending_review" },
  { id: "f8", userId: "u_new2", nickname: "오가와미쿠", country: "JP", flag: { kind: "financial_solicitation", severity: "medium", source: "automated", detectedAt: "2026-04-07", details: "'투자 기회' 키워드 NLP 감지" }, moderationStatus: "pending_review" },
];

export const DASHBOARD_STATS = {
  pendingReports: ALL_REPORTS.filter(r => r.status === "pending").length,
  pendingVerifications: VERIFICATION_QUEUE.filter(v => v.status === "pending_review").length,
  pendingAppeals: APPEALS.filter(a => a.status === "pending").length,
  highRiskUsers: MOCK_USERS.filter(u => u.riskScore >= 60).length,
  totalUsers: 12847,
  activeToday: 4821,
  reportsByCategory: [
    { category: "financial_scam", count: 28, label: "금융 사기" },
    { category: "fake_profile", count: 21, label: "가짜 프로필" },
    { category: "romance_scam", count: 17, label: "로맨스 스캠" },
    { category: "off_platform_contact", count: 14, label: "외부 앱 유도" },
    { category: "spam_messages", count: 11, label: "스팸" },
    { category: "ai_generated_photos", count: 9, label: "AI 생성 사진" },
    { category: "harassment", count: 7, label: "괴롭힘" },
    { category: "impersonation", count: 5, label: "사칭" },
    { category: "underage", count: 3, label: "미성년자" },
    { category: "other", count: 8, label: "기타" },
  ],
  recentActivity: [
    { id: "act1", type: "report", text: "김민준에 대한 금융사기 신고 접수", time: "2분 전", severity: "high" },
    { id: "act2", type: "flag", text: "AI 이미지 감지: 오가와미쿠 자동 플래그", time: "18분 전", severity: "medium" },
    { id: "act3", type: "action", text: "다나카유이 계정 정지 처리 (2주)", time: "1시간 전", severity: "high" },
    { id: "act4", type: "appeal", text: "다나카유이 이의 신청 접수", time: "2시간 전", severity: "medium" },
    { id: "act5", type: "verify", text: "박지수 신분증 인증 신규 접수", time: "3시간 전", severity: "low" },
    { id: "act6", type: "action", text: "나카무라료 이의 신청 승인 — 계정 복구", time: "오전 11:00", severity: "low" },
    { id: "act7", type: "report", text: "이태양 외부 앱 유도 자동 탐지", time: "오전 10:30", severity: "medium" },
  ],
};

export function getRiskLevel(score: number) {
  if (score < 20) return { label: "안전", color: "text-emerald-700 bg-emerald-50" };
  if (score < 40) return { label: "낮음", color: "text-sky-700 bg-sky-50" };
  if (score < 60) return { label: "보통", color: "text-amber-700 bg-amber-50" };
  if (score < 80) return { label: "높음", color: "text-orange-700 bg-orange-50" };
  return { label: "위험", color: "text-red-700 bg-red-50" };
}

export function getAccountStatusConfig(status: AccountActionStatus) {
  const map: Record<AccountActionStatus, { label: string; color: string; dot: string }> = {
    active: { label: "정상", color: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
    warned: { label: "경고됨", color: "text-amber-700 bg-amber-50", dot: "bg-amber-500" },
    restricted: { label: "제한됨", color: "text-orange-700 bg-orange-50", dot: "bg-orange-500" },
    shadow_banned: { label: "숨김 차단", color: "text-purple-700 bg-purple-50", dot: "bg-purple-500" },
    suspended: { label: "정지됨", color: "text-red-700 bg-red-50", dot: "bg-red-500" },
    permanently_banned: { label: "영구 차단", color: "text-gray-100 bg-gray-800", dot: "bg-gray-600" },
  };
  return map[status];
}

export function getSeverityConfig(severity: RiskFlagSeverity) {
  const map: Record<RiskFlagSeverity, { label: string; color: string }> = {
    low: { label: "낮음", color: "text-sky-700 bg-sky-50" },
    medium: { label: "보통", color: "text-amber-700 bg-amber-50" },
    high: { label: "높음", color: "text-orange-700 bg-orange-50" },
    critical: { label: "위험", color: "text-red-700 bg-red-50" },
  };
  return map[severity];
}

export function getFlagKindLabel(kind: RiskFlagKind): string {
  const map: Record<RiskFlagKind, string> = {
    ai_generated_image: "AI 생성 사진",
    identity_mismatch: "신분증 불일치",
    bulk_repetitive_message: "반복 메시지",
    off_platform_lure: "외부 앱 유도",
    financial_solicitation: "금융 사기 언어",
    multi_account_device: "다중 계정",
    repeated_reports: "반복 신고",
  };
  return map[kind];
}

export function getReportCategoryLabel(cat: ReportCategory): string {
  const map: Record<ReportCategory, string> = {
    fake_profile: "가짜 프로필",
    ai_generated_photos: "AI 생성 사진",
    impersonation: "사칭",
    romance_scam: "로맨스 스캠",
    financial_scam: "금융 사기",
    off_platform_contact: "외부 앱 유도",
    spam_messages: "스팸 메시지",
    harassment: "괴롭힘",
    underage: "미성년자",
    other: "기타",
  };
  return map[cat];
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
