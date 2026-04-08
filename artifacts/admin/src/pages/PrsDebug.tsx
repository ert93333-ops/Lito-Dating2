import { useState } from "react";
import {
  PRS_DEBUG_SNAPSHOTS,
  PRS_MOCK_AGGREGATES,
  type AdminPrsSnapshot,
  type PrsSnapshotHistory,
  STAGE_LABELS,
  LOW_CONF_LABELS,
  POLARITY_COLOR,
  DEBUG_FLAG_COLOR,
  fmtDateShort,
} from "@/data/prsDebugData";

// ─────────────────────────────────────────────────────────────────────────────
// Primitive UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBar({
  value,
  color = "bg-blue-500",
  max = 1,
}: {
  value: number;
  color?: string;
  max?: number;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-500 w-8 text-right flex-shrink-0">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-slate-700 font-semibold text-sm">{title}</span>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Chip({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-500 text-xs flex-shrink-0 w-36">{label}</span>
      <span className="text-slate-800 text-xs font-medium text-right break-all">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate stats row
// ─────────────────────────────────────────────────────────────────────────────

function AggregateStats() {
  const a = PRS_MOCK_AGGREGATES;
  const prsBuckets = Object.entries(a.prsBuckets);
  const maxPrs = Math.max(...prsBuckets.map(([, v]) => v));

  return (
    <div className="space-y-5">
      {/* Headline cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "총 스냅샷", value: a.totalSnapshots.toLocaleString(), color: "text-slate-800" },
          { label: "평균 PRS", value: a.avgPrs, color: "text-blue-600" },
          { label: "평균 CS", value: a.avgCs, color: "text-emerald-600" },
          { label: "스캠 패널티", value: `${a.pctScamPenalty}%`, color: "text-red-600" },
          { label: "점수 숨김", value: `${a.pctHiddenScore}%`, color: "text-amber-600" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-slate-400 text-xs">{c.label}</div>
            <div className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PRS bucket distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">PRS 분포</div>
          <div className="space-y-2">
            {prsBuckets.map(([bucket, count]) => (
              <div key={bucket} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono w-12">{bucket}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-2 bg-blue-400 rounded-full"
                    style={{ width: `${(count / maxPrs) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">스테이지 분포</div>
          <div className="space-y-2">
            {Object.entries(a.stageDistribution).map(([stage, count]) => {
              const total = Object.values(a.stageDistribution).reduce((s, v) => s + v, 0);
              const colors: Record<string, string> = { opening: "bg-slate-400", discovery: "bg-indigo-400", escalation: "bg-emerald-500" };
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-10">{STAGE_LABELS[stage as keyof typeof STAGE_LABELS]}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full">
                    <div className={`h-2 rounded-full ${colors[stage]}`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Signal flags */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">신호 플래그 비율</div>
          <div className="space-y-2">
            {[
              { label: "혼합 신호", pct: a.pctMixedSignals, color: "bg-amber-400" },
              { label: "진전 신호", pct: a.pctProgressionSignal, color: "bg-emerald-500" },
              { label: "번역 낮음", pct: a.pctTranslationLow, color: "bg-blue-400" },
              { label: "스캠 패널티", pct: a.pctScamPenalty, color: "bg-red-500" },
              { label: "점수 숨김", pct: a.pctHiddenScore, color: "bg-slate-400" },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">{f.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full">
                  <div className={`h-2 rounded-full ${f.color}`} style={{ width: `${f.pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-7 text-right">{f.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Locale breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-700 mb-3">로케일 쌍 분포</div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(a.localePairDistribution).map(([lp, count]) => {
            const total = Object.values(a.localePairDistribution).reduce((s, v) => s + v, 0);
            return (
              <div key={lp} className="flex flex-col items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                <span className="text-xs font-bold text-slate-700">{lp}</span>
                <span className="text-lg font-bold text-indigo-600">{count}</span>
                <span className="text-xs text-slate-400">{Math.round((count / total) * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot selector sidebar
// ─────────────────────────────────────────────────────────────────────────────

const STATE_DOT: Record<string, string> = {
  strong: "bg-emerald-500",
  moderate: "bg-blue-400",
  mixed: "bg-amber-400",
  low: "bg-rose-400",
  hidden: "bg-slate-400",
  insufficient: "bg-slate-300",
};

function SnapshotListItem({
  snap,
  selected,
  onClick,
}: {
  snap: AdminPrsSnapshot;
  selected: boolean;
  onClick: () => void;
}) {
  const dot = STATE_DOT[snap.publicFacingState] ?? "bg-slate-300";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
        selected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs font-mono text-slate-600 truncate">{snap.conversationId}</span>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-slate-500">{STAGE_LABELS[snap.stage]}</span>
        <span className="text-xs font-bold text-blue-600">PRS {snap.prsScore}</span>
        <span className="text-xs text-slate-400">CS {snap.confidenceScore}</span>
      </div>
      {snap.debugFlags.length > 0 && (
        <div className="ml-4 mt-1 flex flex-wrap gap-1">
          {snap.debugFlags.map(f => (
            <span key={f} className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${DEBUG_FLAG_COLOR[f] ?? "bg-slate-100 text-slate-500"}`}>
              {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot detail panel
// ─────────────────────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<keyof AdminPrsSnapshot["featureBreakdown"], string> = {
  responsiveness: "반응성",
  reciprocity: "상호성",
  linguisticMatching: "언어 유사성",
  temporalEngagement: "시간 참여도",
  warmth: "온기",
  progression: "진전 신호",
};

const FEATURE_COLORS: Record<keyof AdminPrsSnapshot["featureBreakdown"], string> = {
  responsiveness: "bg-blue-400",
  reciprocity: "bg-indigo-400",
  linguisticMatching: "bg-violet-400",
  temporalEngagement: "bg-sky-400",
  warmth: "bg-rose-400",
  progression: "bg-emerald-500",
};

const PENALTY_LABELS: Record<keyof AdminPrsSnapshot["penaltyBreakdown"], string> = {
  earlyOversharePenalty: "과도한 초반 공개",
  selfPromotionPenalty: "자기 홍보",
  genericTemplatePenalty: "형식적 답장",
  nonContingentTopicSwitchPenalty: "맥락 없는 화제 전환",
  scamRiskPenalty: "스캠 리스크",
};

const RAW_SIGNAL_LABELS: Record<keyof AdminPrsSnapshot["rawSignals"], string> = {
  followUpQuestionRate: "후속 질문 비율",
  topicContinuitySignal: "주제 연속성",
  disclosureBalance: "공개 균형",
  partnerReinitiation: "상대방 재개 횟수",
  baselineAdjustedReplySpeed: "기준선 조정 답장 속도",
  availabilitySharingDetected: "가용성 공유 감지",
  progressionTriggerDetected: "진전 트리거 감지",
};

const CS_COMPONENT_LABELS: Record<keyof AdminPrsSnapshot["confidenceComponents"], string> = {
  messageVolumeFactor: "메시지 볼륨",
  sessionCountFactor: "세션 수",
  signalConsistencyFactor: "신호 일관성",
  recentnessFactor: "최근성",
  translationReliabilityFactor: "번역 신뢰도",
};

function SnapshotDetail({ snap }: { snap: AdminPrsSnapshot }) {
  const [histOpen, setHistOpen] = useState(false);

  const confLabelKo = snap.lowConfidenceState
    ? LOW_CONF_LABELS[snap.lowConfidenceState]
    : "정상";

  const stageColor: Record<string, string> = {
    opening: "bg-slate-100 text-slate-600",
    discovery: "bg-indigo-50 text-indigo-700",
    escalation: "bg-emerald-50 text-emerald-700",
  };

  const stateColor: Record<string, string> = {
    strong: "bg-emerald-50 text-emerald-700",
    moderate: "bg-blue-50 text-blue-700",
    mixed: "bg-amber-50 text-amber-700",
    low: "bg-rose-50 text-rose-700",
    hidden: "bg-slate-100 text-slate-600",
    insufficient: "bg-slate-100 text-slate-400",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-800">{snap.conversationId}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor[snap.stage]}`}>
                {STAGE_LABELS[snap.stage]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateColor[snap.publicFacingState]}`}>
                {snap.publicFacingState}
              </span>
              {snap.debugFlags.map(f => (
                <span key={f} className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEBUG_FLAG_COLOR[f] ?? "bg-slate-100 text-slate-500"}`}>
                  {f.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {snap.userId} ↔ {snap.partnerId} · {snap.localePair}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{snap.prsScore}</div>
              <div className="text-xs text-slate-400">PRS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{snap.confidenceScore}</div>
              <div className="text-xs text-slate-400">CS</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic context */}
        <SectionCard title="기본 컨텍스트">
          <div className="space-y-0">
            <InfoRow label="스냅샷 ID" value={<span className="font-mono text-[11px]">{snap.snapshotId}</span>} />
            <InfoRow label="대화 ID" value={<span className="font-mono text-[11px]">{snap.conversationId}</span>} />
            <InfoRow label="사용자" value={snap.userId} />
            <InfoRow label="상대방" value={snap.partnerId} />
            <InfoRow label="로케일" value={snap.localePair} />
            <InfoRow label="생성일" value={fmtDateShort(snap.createdAt)} />
            <InfoRow label="마지막 활동" value={fmtDateShort(snap.lastActiveAt)} />
            <InfoRow label="총 턴 수" value={`${snap.totalTurns}턴 · 상대 메시지 ${snap.partnerMessageCount}개`} />
            <InfoRow label="스테이지" value={STAGE_LABELS[snap.stage]} />
            <InfoRow label="모델 버전" value={<span className="font-mono">{snap.modelVersion}</span>} />
            <InfoRow label="피처 버전" value={<span className="font-mono">{snap.featureVersion}</span>} />
          </div>
        </SectionCard>

        {/* Output summary */}
        <SectionCard title="출력 요약">
          <div className="space-y-0">
            <InfoRow label="PRS 점수" value={<span className="font-bold text-blue-600">{snap.prsScore}</span>} />
            <InfoRow label="신뢰도 점수" value={<span className="font-bold text-emerald-600">{snap.confidenceScore}</span>} />
            <InfoRow label="저신뢰 상태" value={
              <span className={snap.lowConfidenceState ? "text-amber-600 font-medium" : "text-slate-400"}>
                {confLabelKo}
              </span>
            } />
            <InfoRow label="공개 상태" value={snap.publicFacingState} />
            <InfoRow label="모델 버전" value={snap.modelVersion} />
            <InfoRow label="피처 버전" value={snap.featureVersion} />
          </div>
        </SectionCard>
      </div>

      {/* Feature breakdown */}
      <SectionCard title="피처 그룹 점수 분해">
        <div className="space-y-2.5">
          {(Object.keys(snap.featureBreakdown) as Array<keyof typeof snap.featureBreakdown>).map(k => (
            <div key={k} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-28 flex-shrink-0">{FEATURE_LABELS[k]}</span>
              <div className="flex-1">
                <ScoreBar value={snap.featureBreakdown[k]} color={FEATURE_COLORS[k]} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Penalty breakdown */}
      <SectionCard
        title="패널티 분해"
        badge={
          Object.values(snap.penaltyBreakdown).some(v => v > 0)
            ? <span className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full font-medium">패널티 발생</span>
            : <span className="text-xs text-slate-400">패널티 없음</span>
        }
      >
        <div className="space-y-2.5">
          {(Object.keys(snap.penaltyBreakdown) as Array<keyof typeof snap.penaltyBreakdown>).map(k => {
            const v = snap.penaltyBreakdown[k];
            return (
              <div key={k} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-40 flex-shrink-0">{PENALTY_LABELS[k]}</span>
                <div className="flex-1">
                  <ScoreBar value={v} color={v > 0.5 ? "bg-red-400" : v > 0 ? "bg-amber-400" : "bg-slate-200"} />
                </div>
                {k === "scamRiskPenalty" && v >= 0.5 && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">CS 캡 45</span>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Reason codes / insights */}
      <SectionCard title={`이유 코드 · 생성 인사이트 (${snap.generatedInsights.length}개)`}>
        {snap.generatedInsights.length === 0 ? (
          <p className="text-slate-400 text-sm">인사이트 없음 (데이터 부족)</p>
        ) : (
          <div className="space-y-2">
            {snap.generatedInsights.map((ins, i) => (
              <div key={i} className={`rounded-lg border p-2.5 ${POLARITY_COLOR[ins.polarity]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold opacity-70">{ins.reasonCode}</span>
                  <Chip
                    label={ins.polarity === "positive" ? "긍정" : ins.polarity === "negative" ? "부정" : "중립"}
                    className={POLARITY_COLOR[ins.polarity]}
                  />
                </div>
                <p className="text-xs">🇰🇷 {ins.textKo}</p>
                <p className="text-xs opacity-70">🇯🇵 {ins.textJa}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Confidence components */}
        <SectionCard title="신뢰도 구성 요소">
          <div className="space-y-2.5">
            {(Object.keys(snap.confidenceComponents) as Array<keyof typeof snap.confidenceComponents>).map(k => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-28 flex-shrink-0">{CS_COMPONENT_LABELS[k]}</span>
                <div className="flex-1">
                  <ScoreBar
                    value={snap.confidenceComponents[k]}
                    color={snap.confidenceComponents[k] < 0.4 ? "bg-amber-400" : "bg-emerald-400"}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Raw signals */}
        <SectionCard title="원시 신호">
          <div className="space-y-1">
            {(Object.keys(snap.rawSignals) as Array<keyof typeof snap.rawSignals>).map(k => {
              const v = snap.rawSignals[k];
              return (
                <div key={k} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500">{RAW_SIGNAL_LABELS[k]}</span>
                  {typeof v === "boolean" ? (
                    <span className={`text-xs font-bold ${v ? "text-emerald-600" : "text-slate-400"}`}>
                      {v ? "감지됨" : "없음"}
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-bold text-slate-700">{v.toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Snapshot history */}
      <SectionCard
        title={`스냅샷 이력 (${snap.snapshotHistory.length}개)`}
        badge={
          <button
            onClick={() => setHistOpen(h => !h)}
            className="text-xs text-indigo-600 hover:underline ml-auto"
          >
            {histOpen ? "접기" : "펼치기"}
          </button>
        }
      >
        {!histOpen ? (
          <p className="text-slate-400 text-xs">시간순 스냅샷 이력 — 버튼을 눌러 확인하세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {["시각", "PRS", "CS", "스테이지", "주요 코드"].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snap.snapshotHistory.map((h: PrsSnapshotHistory, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 pr-4 text-slate-600 font-mono">{fmtDateShort(h.snappedAt)}</td>
                    <td className="py-1.5 pr-4 font-bold text-blue-600">{h.prsScore}</td>
                    <td className="py-1.5 pr-4 font-bold text-emerald-600">{h.confidenceScore}</td>
                    <td className="py-1.5 pr-4 text-slate-600">{STAGE_LABELS[h.stage]}</td>
                    <td className="py-1.5 font-mono text-slate-500">{h.primaryReasonCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mini trend bar */}
            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-1.5">PRS 추이</div>
              <div className="flex items-end gap-1 h-12">
                {snap.snapshotHistory.map((h, i) => (
                  <div
                    key={i}
                    title={`${h.prsScore} @ ${fmtDateShort(h.snappedAt)}`}
                    className="flex-1 bg-blue-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.round((h.prsScore / 100) * 100)}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "snapshots" | "analytics";

export default function PrsDebug() {
  const [tab, setTab] = useState<Tab>("snapshots");
  const [selectedId, setSelectedId] = useState<string>(PRS_DEBUG_SNAPSHOTS[0].snapshotId);
  const [searchQ, setSearchQ] = useState("");

  const filtered = PRS_DEBUG_SNAPSHOTS.filter(s =>
    s.conversationId.includes(searchQ) ||
    s.userId.includes(searchQ) ||
    s.partnerId.includes(searchQ) ||
    s.localePair.includes(searchQ) ||
    s.reasonCodes.some(c => c.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const selected = PRS_DEBUG_SNAPSHOTS.find(s => s.snapshotId === selectedId) ?? PRS_DEBUG_SNAPSHOTS[0];

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-slate-800 font-bold text-xl">AI 관심 신호 — 내부 디버거</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">
              INTERNAL ONLY
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            PRS 채점 엔진 · 피처 분해 · 패널티 · 신뢰도 구성 요소 · 이력 검사
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500">⚠</span>
          모더레이터/내부 팀 전용
        </div>
      </div>

      {/* Version info bar */}
      <div className="flex items-center gap-4 bg-slate-800 text-slate-300 text-xs px-4 py-2.5 rounded-lg font-mono">
        <span>modelVersion: <strong className="text-white">v1</strong></span>
        <span className="text-slate-600">|</span>
        <span>featureVersion: <strong className="text-white">v1</strong></span>
        <span className="text-slate-600">|</span>
        <span>채점 엔진: <strong className="text-white">prsScoring.ts</strong></span>
        <span className="text-slate-600">|</span>
        <span>피처 추출: <strong className="text-white">prsSignals.ts</strong></span>
        <span className="text-slate-600">|</span>
        <span className="ml-auto text-slate-500">telemetry: in-memory ring buffer (max 1000)</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["snapshots", "analytics"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "snapshots" ? "대화 스냅샷 검사" : "집계 분석"}
          </button>
        ))}
      </div>

      {tab === "analytics" ? (
        <AggregateStats />
      ) : (
        <div className="flex gap-4 min-h-0">
          {/* Sidebar — conversation list */}
          <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-240px)] overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="ID · 코드 · 로케일 검색"
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="text-xs text-slate-400 mt-1.5">{filtered.length}개 표시</div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {filtered.map(snap => (
                <SnapshotListItem
                  key={snap.snapshotId}
                  snap={snap}
                  selected={snap.snapshotId === selectedId}
                  onClick={() => setSelectedId(snap.snapshotId)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-slate-400 text-xs text-center py-8">검색 결과 없음</p>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-240px)] pr-1">
            <SnapshotDetail snap={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
