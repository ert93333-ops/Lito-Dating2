import React, { useRef } from "react";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

let _uid = 0;

interface CountryFlagProps {
  country: "KR" | "JP";
  size?: number;
}

/**
 * 실제 국기 SVG — 이모지 미사용, Android 안전
 * KR: 태극기 (태극 + 건곤감리 4괘)
 * JP: 히노마루 (日の丸)
 */
export function CountryFlag({ country, size = 22 }: CountryFlagProps) {
  const idRef = useRef(`flag-${_uid++}`);
  const id = idRef.current;

  const W = Math.round(size * 1.5);
  const H = size;

  if (country === "JP") {
    const clipId = `${id}-c`;
    return (
      <Svg width={W} height={H} viewBox="0 0 300 200">
        <Defs>
          <ClipPath id={clipId}>
            <Rect x="0" y="0" width="300" height="200" rx="12" />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <Rect x="0" y="0" width="300" height="200" fill="#FFFFFF" />
          <Circle cx="150" cy="100" r="60" fill="#BC002D" />
          <Rect x="0" y="0" width="300" height="200" rx="12"
            fill="none" stroke="#DDDDDD" strokeWidth="3" />
        </G>
      </Svg>
    );
  }

  // ── 태극기 (KR) ───────────────────────────────────────────────────────────
  // viewBox 300×200, A=200, R=50 (outer radius), r=25 (inner)
  // Center: (150, 100)

  // ── 괘(卦) 그리기 헬퍼 ───────────────────────────────────────────────────
  // 각 막대: 전효(全爻)=실선, 단효(斷爻)=두 조각
  // bars: true=실선(양), false=단효(음)
  // cx/cy = 그룹 중심, angle = 회전 각도
  const renderTrigram = (
    bars: [boolean, boolean, boolean],
    cx: number,
    cy: number,
    angle: number
  ) => {
    const bw = 56; // 막대 전체 너비
    const bh = 7;  // 막대 높이
    const gap = 6; // 막대 간격
    const breakW = 10; // 단효 가운데 빈 공간

    const yOffsets = [-gap - bh, 0, gap + bh]; // 위/가운데/아래

    return (
      <G transform={`translate(${cx},${cy}) rotate(${angle})`}>
        {bars.map((solid, i) => {
          const y = yOffsets[i] - bh / 2;
          if (solid) {
            return <Rect key={i} x={-bw / 2} y={y} width={bw} height={bh} fill="#000000" />;
          } else {
            const hw = (bw - breakW) / 2;
            return (
              <G key={i}>
                <Rect x={-bw / 2} y={y} width={hw} height={bh} fill="#000000" />
                <Rect x={bw / 2 - hw} y={y} width={hw} height={bh} fill="#000000" />
              </G>
            );
          }
        })}
      </G>
    );
  };

  return (
    <Svg width={W} height={H} viewBox="0 0 300 200">
      <Defs>
        <ClipPath id={id}>
          <Rect x="0" y="0" width="300" height="200" rx="12" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        {/* 배경 */}
        <Rect x="0" y="0" width="300" height="200" fill="#FFFFFF" />

        {/* ── 태극 ──────────────────────────────────────────────────────── */}
        <G>
          {/* 빨강(양) — 오른쪽 절반 S곡선 */}
          <Path
            d="M 150 50 A 50 50 0 0 1 150 150 A 25 25 0 0 1 150 100 A 25 25 0 0 0 150 50 Z"
            fill="#C60C30"
            transform="rotate(-45, 150, 100)"
          />
          {/* 파랑(음) — 왼쪽 절반 S곡선 */}
          <Path
            d="M 150 50 A 50 50 0 0 0 150 150 A 25 25 0 0 0 150 100 A 25 25 0 0 1 150 50 Z"
            fill="#003478"
            transform="rotate(-45, 150, 100)"
          />
          {/* 양 속 음점 (파랑) */}
          <Circle
            cx="150"
            cy="75"
            r="11"
            fill="#003478"
            transform="rotate(-45, 150, 100)"
          />
          {/* 음 속 양점 (빨강) */}
          <Circle
            cx="150"
            cy="125"
            r="11"
            fill="#C60C30"
            transform="rotate(-45, 150, 100)"
          />
        </G>

        {/* ── 4괘 ────────────────────────────────────────────────────────── */}
        {/* 건(乾) ☰ 3실선 — 좌상 */}
        {renderTrigram([true, true, true], 74, 52, -45)}
        {/* 리(離) ☲ 실·단·실 — 우상 */}
        {renderTrigram([true, false, true], 226, 52, 45)}
        {/* 감(坎) ☵ 단·실·단 — 좌하 */}
        {renderTrigram([false, true, false], 74, 148, 45)}
        {/* 곤(坤) ☷ 3단효 — 우하 */}
        {renderTrigram([false, false, false], 226, 148, -45)}

        {/* 테두리 */}
        <Rect
          x="0" y="0" width="300" height="200" rx="12"
          fill="none" stroke="#CCCCCC" strokeWidth="3"
        />
      </G>
    </Svg>
  );
}
