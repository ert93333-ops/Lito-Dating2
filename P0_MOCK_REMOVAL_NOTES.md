# P0-1 Mock 제거 작업 노트

## Mock 의존성 전수 조사 결과

### 1. AppContext.tsx (핵심)
- L4-9: `mockConversations`, `mockMessagesAiJia`, `mockMessagesAiMio`, `myProfile` import
- L164-169: AI_INITIAL_CONVERSATIONS = mockConversations.filter(isAI)
- L167-169: AI_INITIAL_MESSAGES = { conv_ai_mio: mockMessagesAiMio, conv_ai_jia: mockMessagesAiJia }
- L179: profile 초기값 = myProfile (하드코딩된 Mock)
- L667: logout 시 setProfile(myProfile)
- L671: logout 시 setConversations(AI_INITIAL_CONVERSATIONS)
- L672: logout 시 setMessages(AI_INITIAL_MESSAGES)

### 2. chat/[id].tsx
- L35: `const CURRENT_USER_ID = "me"` (하드코딩)
- 이 값은 senderId 비교에 사용됨 → 실제 userId로 교체 필요

### 3. prsSignals.ts
- `const MY_ID = "me"` (하드코딩)

## 제거 전략
1. AppContext.tsx: myProfile → 빈 프로필 초기값 + /api/auth/me에서 hydrate
2. AppContext.tsx: AI 대화방 → 로컬 상수로 분리 (mockData.ts에서 독립)
3. chat/[id].tsx: CURRENT_USER_ID → AppContext의 profile.id 사용
4. prsSignals.ts: MY_ID → 함수 파라미터로 전달

## API 매핑
| 화면 | 호출 API | 용도 |
|------|----------|------|
| discover | GET /api/users/discover | 이미 연동됨 |
| matches | GET /api/chat/conversations | fetchConversations에서 매칭 목록 추출 |
| chat | GET /api/chat/:id/messages | loadConversationMessages |
| chat | POST /api/chat/:id/messages | sendMessage |
| profile-setup | PUT /api/auth/profile | 프로필 저장 |
| login | POST /api/auth/login, /register | 이미 연동됨 |
| 앱 시작 | GET /api/auth/me | 프로필 hydrate |
