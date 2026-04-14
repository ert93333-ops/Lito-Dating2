export interface InterestEntry {
  ko: string;
  ja: string;
}

export const INTERESTS_I18N: InterestEntry[] = [
  { ko: "케이팝",      ja: "K-POP" },
  { ko: "드라마",      ja: "韓国ドラマ" },
  { ko: "애니메이션",  ja: "アニメ" },
  { ko: "여행",        ja: "旅行" },
  { ko: "요리",        ja: "料理" },
  { ko: "카페",        ja: "カフェ" },
  { ko: "사진",        ja: "写真" },
  { ko: "음악",        ja: "音楽" },
  { ko: "독서",        ja: "読書" },
  { ko: "운동",        ja: "フィットネス" },
  { ko: "게임",        ja: "ゲーム" },
  { ko: "자연",        ja: "自然" },
  { ko: "영화",        ja: "映画" },
  { ko: "패션",        ja: "ファッション" },
  { ko: "디자인",      ja: "デザイン" },
  { ko: "언어 교환",   ja: "語学交換" },
  { ko: "맛집 탐방",  ja: "グルメ" },
  { ko: "등산",        ja: "ハイキング" },
  { ko: "예술",        ja: "アート" },
  { ko: "IT/테크",     ja: "テクノロジー" },
];

/**
 * Translate a stored interest tag to the target language.
 * Matches against both ko and ja fields. Falls back to the original string.
 */
export function translateInterest(
  stored: string,
  targetLang: "ko" | "ja"
): string {
  const entry = INTERESTS_I18N.find(
    (e) => e.ko === stored || e.ja === stored
  );
  if (entry) return entry[targetLang];
  return stored;
}
