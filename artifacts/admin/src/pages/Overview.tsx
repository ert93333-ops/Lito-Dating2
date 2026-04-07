import { Link } from "wouter";
import { DASHBOARD_STATS, MOCK_USERS, getRiskLevel } from "@/data/mockData";

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function ActivityDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    report: "bg-rose-500",
    flag: "bg-amber-500",
    action: "bg-red-600",
    appeal: "bg-purple-500",
    verify: "bg-blue-500",
  };
  return <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors[type] || "bg-slate-400"}`} />;
}

export default function Overview() {
  const maxCount = Math.max(...DASHBOARD_STATS.reportsByCategory.map(r => r.count));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-slate-800 font-bold text-xl">오늘의 신뢰 & 안전 현황</h2>
        <p className="text-slate-500 text-sm mt-1">실시간 데이터 (MVP: 목업)</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="대기 중인 신고" value={DASHBOARD_STATS.pendingReports} sub="즉시 검토 필요" color="text-rose-600" />
        <StatCard label="인증 대기" value={DASHBOARD_STATS.pendingVerifications} sub="신분증 확인 필요" color="text-blue-600" />
        <StatCard label="이의 신청" value={DASHBOARD_STATS.pendingAppeals} sub="응답 필요" color="text-purple-600" />
        <StatCard label="고위험 사용자" value={DASHBOARD_STATS.highRiskUsers} sub="리스크 스코어 ≥ 60" color="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">신고 카테고리 분포 (이번 달)</h3>
          <div className="space-y-2.5">
            {DASHBOARD_STATS.reportsByCategory.map(cat => (
              <div key={cat.category} className="flex items-center gap-3">
                <div className="text-slate-600 text-xs w-24 flex-shrink-0">{cat.label}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-rose-400 h-2 rounded-full transition-all"
                    style={{ width: `${(cat.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="text-slate-500 text-xs w-6 text-right">{cat.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">최근 활동</h3>
          <div className="space-y-3">
            {DASHBOARD_STATS.recentActivity.map(act => (
              <div key={act.id} className="flex gap-2.5">
                <ActivityDot type={act.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 text-xs leading-relaxed">{act.text}</p>
                  <p className="text-slate-400 text-xs">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High risk user table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">고위험 사용자 현황</h3>
          <Link href="/users">
            <span className="text-blue-600 text-xs hover:underline cursor-pointer">전체 보기 →</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["닉네임", "국가", "리스크 점수", "계정 상태", "신고 수", ""].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_USERS.filter(u => u.riskScore >= 60).map(user => {
                const rl = getRiskLevel(user.riskScore);
                return (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <img src={user.photo} className="w-7 h-7 rounded-full object-cover bg-slate-200" alt="" />
                        <span className="font-medium text-slate-800">{user.nickname}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{user.country === "KR" ? "🇰🇷 KR" : "🇯🇵 JP"}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rl.color}`}>{user.riskScore} — {rl.label}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 text-xs">{user.accountStatus}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-bold ${user.reportCount >= 5 ? "text-rose-600" : "text-slate-500"}`}>{user.reportCount}건</span>
                    </td>
                    <td className="py-2.5">
                      <Link href={`/users/${user.id}`}>
                        <span className="text-blue-600 text-xs hover:underline cursor-pointer">검토 →</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture notes */}
      <div className="bg-slate-800 rounded-xl p-5 text-slate-300">
        <h3 className="font-semibold text-white text-sm mb-3">📋 관리자 대시보드 아키텍처 설계</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div>
            <p className="text-slate-400 font-medium mb-1">필수 DB 테이블</p>
            <ul className="space-y-0.5">
              <li>• users — 계정 + riskProfile + accountStatus</li>
              <li>• user_reports — 신고 내역 (category, status)</li>
              <li>• risk_flags — 자동/수동 플래그 내역</li>
              <li>• verification_submissions — 신분증 인증 큐</li>
              <li>• moderation_actions — 감사 로그</li>
              <li>• appeals — 이의 신청 추적</li>
            </ul>
          </div>
          <div>
            <p className="text-slate-400 font-medium mb-1">권한 구조</p>
            <ul className="space-y-0.5">
              <li>• readonly: 조회만 가능 (감사용)</li>
              <li>• moderator: 경고/제한 가능</li>
              <li>• senior_moderator: 정지/영구차단 가능</li>
              <li>• admin: 전체 접근 + 권한 관리</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
