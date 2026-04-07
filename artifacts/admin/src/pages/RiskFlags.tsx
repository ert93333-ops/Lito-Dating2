import { useState } from "react";
import { Link } from "wouter";
import { RISK_FLAG_QUEUE, getSeverityConfig, getFlagKindLabel, fmtDate, type RiskFlagSeverity, type RiskFlagKind } from "@/data/mockData";

const SEVERITY_OPTS: Array<{ value: RiskFlagSeverity | "all"; label: string }> = [
  { value: "all", label: "전체 심각도" },
  { value: "critical", label: "위험" },
  { value: "high", label: "높음" },
  { value: "medium", label: "보통" },
  { value: "low", label: "낮음" },
];

const KIND_OPTS: Array<{ value: RiskFlagKind | "all"; label: string }> = [
  { value: "all", label: "전체 종류" },
  { value: "ai_generated_image", label: "AI 생성 사진" },
  { value: "identity_mismatch", label: "신분증 불일치" },
  { value: "bulk_repetitive_message", label: "반복 메시지" },
  { value: "off_platform_lure", label: "외부 앱 유도" },
  { value: "financial_solicitation", label: "금융 사기 언어" },
  { value: "multi_account_device", label: "다중 계정" },
  { value: "repeated_reports", label: "반복 신고" },
];

const SEVERITY_RING: Record<RiskFlagSeverity, string> = {
  critical: "border-red-300 bg-red-50/30",
  high: "border-orange-200 bg-orange-50/30",
  medium: "border-amber-200 bg-amber-50/10",
  low: "border-slate-200 bg-white",
};

export default function RiskFlags() {
  const [severityFilter, setSeverityFilter] = useState<RiskFlagSeverity | "all">("all");
  const [kindFilter, setKindFilter] = useState<RiskFlagKind | "all">("all");

  const filtered = RISK_FLAG_QUEUE.filter(f => {
    if (severityFilter !== "all" && f.flag.severity !== severityFilter) return false;
    if (kindFilter !== "all" && f.flag.kind !== kindFilter) return false;
    return true;
  });

  const pendingCount = RISK_FLAG_QUEUE.filter(f => f.moderationStatus === "pending_review").length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-slate-800 font-bold text-xl">위험 플래그</h2>
        <p className="text-slate-500 text-sm mt-1">
          {pendingCount > 0 && <span className="text-amber-600 font-medium">{pendingCount}건 검토 대기 중 · </span>}
          전체 {RISK_FLAG_QUEUE.length}건
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(["critical", "high", "medium", "low"] as RiskFlagSeverity[]).map(sv => {
          const cfg = getSeverityConfig(sv);
          const count = RISK_FLAG_QUEUE.filter(f => f.flag.severity === sv).length;
          return (
            <div key={sv} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${SEVERITY_RING[sv]}`}>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
              <span className="text-slate-500">{count}건</span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SEVERITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={kindFilter}
          onChange={e => setKindFilter(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none"
        >
          {KIND_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="text-slate-400 text-sm py-2">{filtered.length}건</div>
      </div>

      {/* Flag cards */}
      <div className="grid gap-3">
        {filtered.map(item => {
          const sc = getSeverityConfig(item.flag.severity);
          const isPending = item.moderationStatus === "pending_review";
          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 flex items-start gap-4 ${SEVERITY_RING[item.flag.severity]}`}
            >
              {/* Severity badge */}
              <div className="flex-shrink-0 text-center w-14">
                <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">{getFlagKindLabel(item.flag.kind)}</span>
                  <span className="text-slate-500 text-xs">·</span>
                  <span className="font-medium text-slate-700 text-sm">{item.nickname}</span>
                  <span className="text-slate-400 text-xs">{item.country === "KR" ? "🇰🇷" : "🇯🇵"}</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">{item.flag.details}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span>감지: {fmtDate(item.flag.detectedAt)}</span>
                  <span>출처: {item.flag.source === "automated" ? "자동" : item.flag.source === "user_report" ? "사용자 신고" : "수동 검토"}</span>
                </div>
              </div>

              {/* Status + action */}
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.moderationStatus === "action_taken" ? "bg-emerald-50 text-emerald-700" :
                  item.moderationStatus === "pending_review" ? "bg-amber-50 text-amber-700" :
                  item.moderationStatus === "under_review" ? "bg-blue-50 text-blue-700" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {item.moderationStatus === "action_taken" ? "처리됨" :
                   item.moderationStatus === "pending_review" ? "대기 중" :
                   item.moderationStatus === "under_review" ? "검토 중" : "해결됨"}
                </span>
                {(isPending || item.moderationStatus === "under_review") && (
                  <Link href={`/users/${item.userId}`}>
                    <span className="text-blue-600 text-xs hover:underline cursor-pointer whitespace-nowrap">사용자 검토 →</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Automation info */}
      <div className="bg-slate-800 rounded-xl p-5 text-slate-300 text-xs leading-relaxed">
        <h3 className="text-white font-semibold text-sm mb-2">⚙️ 자동 탐지 규칙</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
          <div>• <strong>bulk_repetitive_message</strong>: 1시간 내 ≥10개 유사 메시지</div>
          <div>• <strong>off_platform_lure</strong>: 텔레그램/라인/위챗 키워드 감지</div>
          <div>• <strong>financial_solicitation</strong>: NLP — 투자/코인/이체 패턴</div>
          <div>• <strong>repeated_reports</strong>: 고유 신고자 ≥5명</div>
          <div>• <strong>ai_generated_image</strong>: GAN 탐지 모델 (Sightengine)</div>
          <div>• <strong>identity_mismatch</strong>: 얼굴 유사도 &lt; 85%</div>
          <div>• <strong>multi_account_device</strong>: 동일 디바이스 ID &gt;1 계정</div>
        </div>
      </div>
    </div>
  );
}
