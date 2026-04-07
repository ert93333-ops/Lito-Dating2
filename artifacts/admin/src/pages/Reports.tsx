import { useState } from "react";
import { Link } from "wouter";
import {
  ALL_REPORTS, MOCK_USERS, getReportCategoryLabel, fmtDate,
  type ReportCategory, type ReportStatus
} from "@/data/mockData";

const CATEGORY_OPTIONS: Array<{ value: ReportCategory | "all"; label: string }> = [
  { value: "all", label: "전체 카테고리" },
  { value: "financial_scam", label: "금융 사기" },
  { value: "fake_profile", label: "가짜 프로필" },
  { value: "romance_scam", label: "로맨스 스캠" },
  { value: "off_platform_contact", label: "외부 앱 유도" },
  { value: "spam_messages", label: "스팸" },
  { value: "ai_generated_photos", label: "AI 생성 사진" },
  { value: "harassment", label: "괴롭힘" },
  { value: "impersonation", label: "사칭" },
  { value: "underage", label: "미성년자" },
  { value: "other", label: "기타" },
];

const STATUS_COLOR: Record<ReportStatus, string> = {
  pending: "text-amber-700 bg-amber-50",
  reviewed: "text-blue-700 bg-blue-50",
  dismissed: "text-slate-500 bg-slate-100",
  actioned: "text-emerald-700 bg-emerald-50",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "대기 중",
  reviewed: "검토됨",
  dismissed: "기각",
  actioned: "처리됨",
};

export default function Reports() {
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = ALL_REPORTS.filter(r => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const reportedUser = MOCK_USERS.find(u => u.id === r.reportedUserId);
      if (!reportedUser?.nickname.toLowerCase().includes(q) && !r.reporterNickname.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pending = ALL_REPORTS.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">신고 큐</h2>
          <p className="text-slate-500 text-sm mt-1">
            {pending > 0 ? <span className="text-rose-600 font-medium">{pending}건 대기 중</span> : "모든 신고가 처리되었습니다"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="닉네임 검색..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 상태</option>
          <option value="pending">대기 중</option>
          <option value="reviewed">검토됨</option>
          <option value="dismissed">기각</option>
          <option value="actioned">처리됨</option>
        </select>
        <div className="text-slate-400 text-sm py-2">{filtered.length}건</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["신고자", "피신고자", "카테고리", "세부 내용", "신고 시간", "상태", ""].map(h => (
                <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-12 text-sm">신고 없음</td>
              </tr>
            ) : (
              filtered.map(report => {
                const reportedUser = MOCK_USERS.find(u => u.id === report.reportedUserId);
                return (
                  <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{report.reporterNickname}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {reportedUser?.photo && (
                          <img src={reportedUser.photo} className="w-6 h-6 rounded-full object-cover bg-slate-200" alt="" />
                        )}
                        <span className="font-medium text-slate-800">
                          {reportedUser?.nickname ?? report.reportedUserId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                        {getReportCategoryLabel(report.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {report.details ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {fmtDate(report.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[report.status]}`}>
                        {STATUS_LABEL[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {reportedUser && (
                        <Link href={`/users/${reportedUser.id}`}>
                          <span className="text-blue-600 text-xs hover:underline cursor-pointer whitespace-nowrap">사용자 검토 →</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Integration note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
        <strong>백엔드 연동 포인트:</strong> POST /api/reports 엔드포인트 → DB 저장 → 리스크 스코어 증가.
        5명 이상 고유 신고자 → automated "repeated_reports" 플래그 → 계정 자동 제한.
        신고 처리 후 모더레이터 메모 + 처리 사유가 감사 로그(moderation_actions 테이블)에 기록되어야 합니다.
      </div>
    </div>
  );
}
