import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  MOCK_USERS, getRiskLevel, getAccountStatusConfig, getSeverityConfig,
  getFlagKindLabel, getReportCategoryLabel, fmtDate, type AccountActionStatus
} from "@/data/mockData";

const ACTIONS: Array<{ key: AccountActionStatus; label: string; color: string; confirm: string }> = [
  { key: "warned", label: "경고 발송", color: "bg-amber-500 hover:bg-amber-600 text-white", confirm: "경고 메시지를 사용자에게 발송하시겠습니까?" },
  { key: "restricted", label: "계정 제한", color: "bg-orange-500 hover:bg-orange-600 text-white", confirm: "이 계정의 기능을 제한하시겠습니까? (새 매칭 불가)" },
  { key: "suspended", label: "계정 정지", color: "bg-red-500 hover:bg-red-600 text-white", confirm: "계정을 일시 정지하시겠습니까?" },
  { key: "permanently_banned", label: "영구 차단", color: "bg-gray-800 hover:bg-gray-900 text-white", confirm: "이 계정을 영구 차단하시겠습니까? 이 작업은 되돌릴 수 없습니다." },
];

export default function UserDetail() {
  const { id } = useParams();
  const [actionTaken, setActionTaken] = useState<string | null>(null);
  const [tab, setTab] = useState<"flags" | "reports">("flags");

  const user = MOCK_USERS.find(u => u.id === id);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-lg">사용자를 찾을 수 없습니다.</p>
        <Link href="/users"><span className="text-blue-600 text-sm hover:underline cursor-pointer mt-2 block">← 목록으로</span></Link>
      </div>
    );
  }

  const rl = getRiskLevel(user.riskScore);
  const statusCfg = getAccountStatusConfig(user.accountStatus);

  const handleAction = (action: typeof ACTIONS[0]) => {
    if (window.confirm(action.confirm)) {
      setActionTaken(action.key);
      alert(`[MVP] ${action.label} 처리됨 — 실제 환경에서는 API 호출`);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/users"><span className="text-blue-600 text-sm hover:underline cursor-pointer">← 목록</span></Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 text-sm">{user.nickname}</span>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row gap-5">
        <img
          src={user.photo}
          alt={user.nickname}
          className="w-24 h-24 rounded-xl object-cover bg-slate-200 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-slate-900 font-bold text-xl">{user.nickname}</h2>
            <span className="text-slate-500 text-sm">{user.country === "KR" ? "🇰🇷" : "🇯🇵"} {user.age}세</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusCfg.dot} mr-1`} />
              {statusCfg.label}
            </span>
          </div>
          <div className="text-slate-400 text-xs mt-1">{user.email}</div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
            <span>가입: {user.joinedAt}</span>
            <span>최근 활동: {fmtDate(user.lastActive)}</span>
            <span>신고 수: <strong className={user.reportCount >= 5 ? "text-rose-600" : "text-slate-700"}>{user.reportCount}건</strong></span>
          </div>
          {user.suspendedUntil && (
            <div className="mt-2 text-xs text-red-600 font-medium">정지 만료: {user.suspendedUntil}</div>
          )}
        </div>
        {/* Risk score */}
        <div className="flex-shrink-0 text-center">
          <div className={`text-4xl font-black ${user.riskScore >= 60 ? "text-red-600" : user.riskScore >= 40 ? "text-amber-600" : "text-emerald-600"}`}>
            {user.riskScore}
          </div>
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${rl.color}`}>리스크 점수</div>
          <div className="text-slate-400 text-xs mt-2">인증: {user.verificationStatus}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: flags + reports tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setTab("flags")}
                className={`px-4 py-3 text-sm font-medium ${tab === "flags" ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:text-slate-700"}`}
              >
                위험 플래그 ({user.flags.length})
              </button>
              <button
                onClick={() => setTab("reports")}
                className={`px-4 py-3 text-sm font-medium ${tab === "reports" ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:text-slate-700"}`}
              >
                수신 신고 ({user.receivedReports.length})
              </button>
            </div>

            {tab === "flags" ? (
              <div className="divide-y divide-slate-100">
                {user.flags.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 text-sm">플래그 없음</div>
                ) : (
                  user.flags.map((flag, i) => {
                    const sc = getSeverityConfig(flag.severity);
                    return (
                      <div key={i} className="px-5 py-4 flex items-start gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${sc.color}`}>{sc.label}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 text-sm">{getFlagKindLabel(flag.kind)}</span>
                            <span className="text-slate-400 text-xs">{flag.source}</span>
                            {flag.resolvedAt && <span className="text-emerald-600 text-xs">✓ 해결됨</span>}
                          </div>
                          <p className="text-slate-500 text-xs mt-1">{flag.details}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{fmtDate(flag.detectedAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {user.receivedReports.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 text-sm">신고 없음</div>
                ) : (
                  user.receivedReports.map(report => (
                    <div key={report.id} className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                          {getReportCategoryLabel(report.category)}
                        </span>
                        <span className="text-slate-500 text-xs">신고자: {report.reporterNickname}</span>
                        <span className="text-slate-400 text-xs">{fmtDate(report.submittedAt)}</span>
                      </div>
                      {report.details && <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">"{report.details}"</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: action panel */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">모더레이터 조치</h3>
            <div className="space-y-2">
              {ACTIONS.map(action => (
                <button
                  key={action.key}
                  onClick={() => handleAction(action)}
                  className={`w-full text-sm font-medium py-2.5 px-3 rounded-lg transition-colors ${action.color} ${actionTaken === action.key ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                >
                  {action.label}
                  {actionTaken === action.key && " ✓"}
                </button>
              ))}
              <hr className="border-slate-100 my-2" />
              <button
                onClick={() => alert("[MVP] 재인증 요청 발송 — 실제 환경에서는 알림 발송")}
                className="w-full text-sm font-medium py-2.5 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
              >
                재인증 요청
              </button>
              <button
                onClick={() => alert("[MVP] 플래그 초기화 — 실제 환경에서는 API 호출")}
                className="w-full text-sm font-medium py-2.5 px-3 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                플래그 초기화
              </button>
            </div>
          </div>

          {/* Appeal section */}
          {user.appealReason && (
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
              <h3 className="font-semibold text-purple-800 text-sm mb-2">⚖️ 이의 신청 내용</h3>
              <p className="text-purple-700 text-xs leading-relaxed">"{user.appealReason}"</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => alert("[MVP] 이의 신청 승인")}
                  className="flex-1 text-xs font-medium py-2 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  승인
                </button>
                <button
                  onClick={() => alert("[MVP] 이의 신청 거부")}
                  className="flex-1 text-xs font-medium py-2 px-3 rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  거부
                </button>
              </div>
            </div>
          )}

          {/* Permission notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
            <strong>권한 필요:</strong>
            <ul className="mt-1 space-y-0.5">
              <li>• 경고/제한: moderator</li>
              <li>• 정지: senior_moderator</li>
              <li>• 영구차단: senior_moderator + 2차 승인</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
