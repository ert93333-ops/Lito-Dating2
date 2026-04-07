import { useState } from "react";
import { APPEALS, fmtDate, type AccountActionStatus } from "@/data/mockData";

const STATUS_LABEL: Record<string, string> = {
  pending: "대기 중",
  approved: "승인됨",
  denied: "거부됨",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-700 bg-amber-50",
  approved: "text-emerald-700 bg-emerald-50",
  denied: "text-red-700 bg-red-50",
};

const ACCOUNT_STATUS_LABEL: Record<AccountActionStatus, string> = {
  active: "정상",
  warned: "경고됨",
  restricted: "제한됨",
  shadow_banned: "숨김 차단",
  suspended: "정지됨",
  permanently_banned: "영구 차단",
};

export default function Appeals() {
  const [decisions, setDecisions] = useState<Record<string, "approved" | "denied">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const decide = (id: string, decision: "approved" | "denied") => {
    const msg = decision === "approved"
      ? "이의 신청을 승인하시겠습니까? 계정 조치가 해제됩니다."
      : "이의 신청을 거부하시겠습니까? 기존 조치가 유지됩니다.";
    if (window.confirm(msg)) {
      setDecisions(prev => ({ ...prev, [id]: decision }));
      alert(`[MVP] ${decision === "approved" ? "승인" : "거부"} 처리됨 — 실제 환경에서는 DB 업데이트 + 사용자 알림`);
    }
  };

  const pending = APPEALS.filter(a => a.status === "pending" && !decisions[a.id]);
  const processed = APPEALS.filter(a => a.status !== "pending" || decisions[a.id]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-slate-800 font-bold text-xl">이의 신청 처리</h2>
        <p className="text-slate-500 text-sm mt-1">
          {pending.length > 0
            ? <span className="text-purple-600 font-medium">{pending.length}건 응답 필요</span>
            : "모든 이의 신청 처리 완료"}
        </p>
      </div>

      {/* Pending appeals */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm">대기 중 ({pending.length})</h3>
          {pending.map(appeal => (
            <div key={appeal.id} className="bg-white rounded-xl border border-purple-200 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{appeal.nickname}</span>
                    <span className="text-slate-400 text-xs">{appeal.country === "KR" ? "🇰🇷" : "🇯🇵"}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                      {ACCOUNT_STATUS_LABEL[appeal.accountStatus]}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs mt-1">이의 신청: {fmtDate(appeal.submittedAt)}</div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">대기 중</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="text-red-600 text-xs font-semibold mb-1">조치 사유</div>
                  <p className="text-red-700 text-xs leading-relaxed">{appeal.actionReason}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="text-purple-600 text-xs font-semibold mb-1">사용자의 이의 내용</div>
                  <p className="text-purple-800 text-xs leading-relaxed">"{appeal.appealReason}"</p>
                </div>
              </div>

              {/* Moderator note */}
              <div>
                <label className="text-slate-500 text-xs font-medium block mb-1">처리 메모 (선택, 감사 로그에 기록됨)</label>
                <textarea
                  value={notes[appeal.id] || ""}
                  onChange={e => setNotes(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  rows={2}
                  placeholder="이의 신청 처리 사유를 입력하세요..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => decide(appeal.id, "approved")}
                  className="flex-1 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  ✓ 이의 신청 승인 (조치 해제)
                </button>
                <button
                  onClick={() => decide(appeal.id, "denied")}
                  className="flex-1 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  ✗ 이의 신청 거부 (유지)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Processed appeals */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 text-sm">처리됨 ({processed.length})</h3>
        {processed.map(appeal => {
          const finalStatus = decisions[appeal.id] || appeal.status;
          const sc = STATUS_COLOR[finalStatus] || "text-slate-500 bg-slate-100";
          return (
            <div key={appeal.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 opacity-80">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm">{appeal.nickname}</span>
                  <span className="text-slate-400 text-xs">{appeal.country === "KR" ? "🇰🇷" : "🇯🇵"}</span>
                  <span className="text-xs text-slate-400">{fmtDate(appeal.submittedAt)}</span>
                </div>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">"{appeal.appealReason}"</p>
                {appeal.reviewedAt && (
                  <div className="text-slate-400 text-xs mt-1">
                    {fmtDate(appeal.reviewedAt)} · {appeal.reviewedBy}
                  </div>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${sc}`}>
                {STATUS_LABEL[finalStatus] || finalStatus}
              </span>
            </div>
          );
        })}
      </div>

      {/* SLA note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
        <strong>이의 신청 처리 SLA:</strong> 접수 후 72시간 이내 응답 목표.
        승인 시 계정 조치 자동 해제 + 사용자 이메일/푸시 알림 발송.
        거부 시 최종 판정 (1회 이의 신청 기회). 모든 결정은 감사 로그에 기록.
      </div>
    </div>
  );
}
