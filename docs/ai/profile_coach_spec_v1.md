---
문서 ID: AI-PROFILE-COACH-V1
문서명: LITO Profile Coach Spec v1
소유 팀: 07_AI설계실
버전: v1.1
문서 상태: LOCKED
입력 문서: AI feature spec / 문화 기준
영향 받는 하위 문서:
- profile coach APIs
- profile editor UI
- wallet/ledger
최종 수정일: 2026-04-21
---

# 목적

- 자기소개 명확화
- 과장/공허 표현 완화
- 문화적 오해 감소
- 양언어 버전 보조

# 출력 스키마

- revisedBio
- shortHeadline
- optionalJapaneseVersion / optionalKoreanVersion
- strengthsToKeep
- improvementChecklist
- bannedOrRiskyPhrases
- confidence
- fallbackUsed

# 금지

- 허위 정보 생성
- 외모 점수화
- 국적/성별 공략형 문구
- 성적 암시 강화
- 경제력/지위 과장

# 상태

- normal
- translation_fail (선택 번역 버전만 실패 가능)
- zero_credit
- unsafe_interaction (필요 시 차단)
- consent_not_given
