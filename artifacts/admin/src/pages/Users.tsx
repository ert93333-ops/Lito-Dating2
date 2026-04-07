import { useState } from "react";
import { Link } from "wouter";
import { MOCK_USERS, getRiskLevel, getAccountStatusConfig } from "@/data/mockData";

export default function Users() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const filtered = MOCK_USERS.filter(u => {
    if (search && !u.nickname.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (riskFilter === "high" && u.riskScore < 60) return false;
    if (riskFilter === "medium" && (u.riskScore < 30 || u.riskScore >= 60)) return false;
    if (riskFilter === "low" && u.riskScore >= 30) return false;
    return true;
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="text-slate-800 font-bold text-xl">사용자 조회</h2>
        <p className="text-slate-500 text-sm mt-1">닉네임 또는 이메일로 검색</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="닉네임 / 이메일 검색..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none"
        >
          <option value="all">전체 리스크</option>
          <option value="high">고위험 (≥60)</option>
          <option value="medium">보통 (30~59)</option>
          <option value="low">낮음 (0~29)</option>
        </select>
        <div className="text-slate-400 text-sm py-2">{filtered.length}명</div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["사용자", "국가", "리스크 점수", "계정 상태", "인증", "신고 수", "가입일", ""].map(h => (
                <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => {
              const rl = getRiskLevel(user.riskScore);
              const statusCfg = getAccountStatusConfig(user.accountStatus);
              return (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img src={user.photo} className="w-8 h-8 rounded-full object-cover bg-slate-200" alt="" />
                      <div>
                        <div className="font-medium text-slate-800">{user.nickname}</div>
                        <div className="text-slate-400 text-xs">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{user.country === "KR" ? "🇰🇷 KR" : "🇯🇵 JP"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rl.color}`}>{user.riskScore}</span>
                      <div className="w-16 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${user.riskScore >= 60 ? "bg-red-400" : user.riskScore >= 40 ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${user.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{user.verificationStatus}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${user.reportCount >= 5 ? "text-rose-600" : "text-slate-500"}`}>
                      {user.reportCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{user.joinedAt}</td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${user.id}`}>
                      <span className="text-blue-600 text-xs hover:underline cursor-pointer">상세 →</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
