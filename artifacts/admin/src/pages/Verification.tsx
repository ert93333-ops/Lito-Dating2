import { useState } from "react";
import { VERIFICATION_QUEUE, fmtDate, type VerificationStatus } from "@/data/mockData";

const STATUS_CONFIG: Record<VerificationStatus, { label: string; color: string }> = {
  not_verified: { label: "미인증", color: "text-slate-500 bg-slate-100" },
  pending_review: { label: "검토 대기", color: "text-amber-700 bg-amber-50" },
  verified: { label: "인증됨", color: "text-emerald-700 bg-emerald-50" },
  rejected: { label: "거부됨", color: "text-red-700 bg-red-50" },
  reverify_required: { label: "재인증 필요", color: "text-orange-700 bg-orange-50" },
};

export default function Verification() {
  const [selected, setSelected] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "approved" | "rejected">>({});

  const pending = VERIFICATION_QUEUE.filter(v => v.status === "pending_review");
  const others = VERIFICATION_QUEUE.filter(v => v.status !== "pending_review");

  const selectedEntry = VERIFICATION_QUEUE.find(v => v.id === selected);

  const decide = (id: string, decision: "approved" | "rejected") => {
    const msg = decision === "approved"
      ? "인증 승인하시겠습니까? 사용자에게 인증 완료 알림이 발송됩니다."
      : "인증을 거부하시겠습니까? 사용자에게 사유와 함께 알림이 발송됩니다.";
    if (window.confirm(msg)) {
      setDecisions(prev => ({ ...prev, [id]: decision }));
      setSelected(null);
      alert(`[MVP] ${decision === "approved" ? "승인" : "거부"} 처리됨 — 실제 환경에서는 DB 업데이트`);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="text-slate-800 font-bold text-xl">신분증 인증 큐</h2>
        <p className="text-slate-500 text-sm mt-1">
          {pending.length > 0
            ? <span className="text-blue-600 font-medium">{pending.length}건 검토 대기 중</span>
            : "검토 대기 중인 인증 없음"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Queue list */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm">대기 중 ({pending.length})</h3>
          {pending.map(entry => (
            <div
              key={entry.id}
              onClick={() => setSelected(entry.id)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                selected === entry.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
              } ${decisions[entry.id] ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <img src={entry.photoUrl} className="w-12 h-12 rounded-lg object-cover bg-slate-200" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{entry.nickname}</div>
                  <div className="text-slate-500 text-xs">{entry.country === "KR" ? "🇰🇷" : "🇯🇵"} {entry.age}세 · {entry.idType}</div>
                  <div className="text-slate-400 text-xs">{fmtDate(entry.submittedAt)}</div>
                </div>
                {decisions[entry.id] ? (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${decisions[entry.id] === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {decisions[entry.id] === "approved" ? "승인됨" : "거부됨"}
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">검토 대기</span>
                )}
              </div>
            </div>
          ))}

          <h3 className="font-semibold text-slate-700 text-sm pt-2">처리됨 ({others.length})</h3>
          {others.map(entry => {
            const sc = STATUS_CONFIG[entry.status];
            return (
              <div
                key={entry.id}
                onClick={() => setSelected(entry.id)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all opacity-70 ${
                  selected === entry.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={entry.photoUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-200" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm">{entry.nickname}</div>
                    <div className="text-slate-400 text-xs">{entry.idType} · {fmtDate(entry.submittedAt)}</div>
                    {entry.notes && <div className="text-red-600 text-xs mt-0.5">{entry.notes}</div>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div>
          {selectedEntry ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">인증 상세</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-400 text-xs mb-1.5">셀카 사진</div>
                  <img src={selectedEntry.photoUrl} className="w-full aspect-[4/3] object-cover rounded-lg bg-slate-200" alt="" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1.5">신분증 사진</div>
                  <img src={selectedEntry.idPhotoUrl} className="w-full aspect-[4/3] object-cover rounded-lg bg-slate-200" alt="" />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">닉네임</span>
                  <span className="font-medium">{selectedEntry.nickname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">국가</span>
                  <span>{selectedEntry.country === "KR" ? "🇰🇷 대한민국" : "🇯🇵 일본"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">나이</span>
                  <span>{selectedEntry.age}세</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">신분증 종류</span>
                  <span>{selectedEntry.idType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">제출일시</span>
                  <span>{fmtDate(selectedEntry.submittedAt)}</span>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700 border border-red-100">
                  <strong>기존 메모:</strong> {selectedEntry.notes}
                </div>
              )}

              {selectedEntry.status === "pending_review" && !decisions[selectedEntry.id] && (
                <div className="space-y-2">
                  <p className="text-slate-500 text-xs">얼굴과 신분증 사진이 동일 인물임을 확인하세요.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(selectedEntry.id, "approved")}
                      className="flex-1 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                    >
                      ✓ 승인
                    </button>
                    <button
                      onClick={() => decide(selectedEntry.id, "rejected")}
                      className="flex-1 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      ✗ 거부
                    </button>
                  </div>
                </div>
              )}

              {decisions[selectedEntry.id] && (
                <div className={`text-center py-3 text-sm font-semibold rounded-lg ${
                  decisions[selectedEntry.id] === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {decisions[selectedEntry.id] === "approved" ? "✓ 이 세션에서 승인됨" : "✗ 이 세션에서 거부됨"}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-sm">왼쪽에서 인증 항목을 선택하면 상세 정보가 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
