# ICARUS — Claude Code 실행 명령서

## 0. 프로젝트 철학 (반드시 읽을 것)

ICARUS는 교육 현장의 교육 구조를 바꾸는 AI 에이전트 시스템입니다.
이카루스 신화에서 영감을 받았습니다. 학생에게 날개를 주는 것이 아니라,
학생이 자신의 날개를 직접 만들고 실패하며 성장하는 구조를 만듭니다.

**세 주체가 각자의 이익으로 참여합니다:**
- 수강생 → 내가 만들고 싶은 것을 만들며 성취감과 포트폴리오를 얻음
- 교강사 → 데이터로 학생 이해도를 파악하고 수업 방향을 조정함
- 운영자 → 이탈 위험 학생을 사전 감지하고 적성 기반 취업을 연결함

---

## 1. 시스템 구조 요약

```
[강사 음성]
    ↓ STT (Google Cloud STT v2)
[MyDay — Gemini Flash]
    강의 핵심 개념 추출 + 강사 승인
    ↓ lesson_context.json 배포
[Central Hub — FastAPI]
    ↓ JSON 전달
[Wing — Claude Sonnet + MCP]
    마이크로 프로젝트 생성 + 빈칸 주입 + 힌트 제어
    ↓ activity_log.json 수집
[Insight — Gemini Flash]
    행동 로그 분석 + 적성 판별 + RED_FLAG 감지
    ↓
[Insight Dashboard — Next.js]
    멘토/운영자용 대시보드
```

---

## 2. 핵심 데이터 파일 (docs/ 폴더 참조)

| 파일명 | 역할 | 흐름 |
| :--- | :--- | :--- |
| `lesson_context.json` | 강사→Wing 지식 전달 | MyDay가 생성, Wing이 수신 |
| `activity_log.json` | Wing→Insight 행동 로그 | Wing이 기록, Insight가 분석 |
| `user_profile.json` | 서버 누적 적성 프로필 | Insight가 업데이트, 대시보드가 조회 |

---

## 3. 에이전트별 역할 및 모델

| 에이전트 | 모델 | 시스템 프롬프트 | 핵심 역할 |
| :--- | :--- | :--- | :--- |
| Wing | Claude 3.5 Sonnet | `wing_system_prompt.md` | MCP로 로컬 파일 제어, 빈칸 주입, 힌트 제공 |
| MyDay | Gemini 1.5 Flash | `myday_system_prompt.md` | STT 요약, lesson_context.json 생성 |
| Insight | Gemini 1.5 Flash | `insight_system_prompt.md` | 로그 분석, 적성 판별, RED_FLAG 생성 |

---

## 4. MCP 도구 목록 (mcp_spec.md 참조)

Wing이 사용하는 도구 5개입니다. 이 이름 그대로 구현하십시오.

| 도구명 | 핵심 제약 |
| :--- | :--- |
| `setup_project` | 루트 경로 외부 접근 금지 |
| `inject_harness` | search_pattern 기반, 기본값 first_occurrence |
| `run_evaluation` | 화이트리스트(javac/python/node)만 허용 |
| `write_activity_log` | 타임스탬프 기반, duration 계산하지 않음 |
| `check_idle_time` | 마지막 입력 이후 경과 시간(초) 반환 |

---

## 5. API 엔드포인트 (api_endpoints.md 참조)

FastAPI 기반 백엔드 서버입니다.

```
POST /lesson/sync       — 강사 지식 업로드
GET  /lesson/{id}       — Wing이 지식 다운로드
POST /activity/log      — 세션 로그 전송
GET  /user/profile/{id} — 누적 프로필 조회
GET  /insight/report/{id} — 세션 분석 리포트
POST /alert/redflag     — 멘토 Slack 알림
```

---

## 6. 기술 스택 (tech_stack.md 참조)

```
Extension   : TypeScript + VS Code Extension API + MCP
Dashboard   : Next.js + Tailwind CSS + Shadcn UI + Recharts
Backend     : FastAPI (Python) + PostgreSQL
배포         : Vercel (프론트) + Railway (백엔드)
STT         : Google Cloud Speech-to-Text v2
```

---

## 7. 구현 순서 (이 순서를 반드시 지킬 것)

한 번에 전체를 짜려 하지 마십시오.
각 Step 완료 후 테스트를 먼저 진행하고 다음으로 넘어가십시오.

### Step 1 — 백엔드 기반
```
1. FastAPI 프로젝트 생성
2. PostgreSQL 연결 및 스키마 정의
   - lesson_context 테이블
   - activity_log 테이블
   - user_profile 테이블
3. API 엔드포인트 6개 구현
4. Slack Webhook 연동
```

### Step 2 — MCP 서버
```
1. MCP 서버 뼈대 생성
2. 도구 5개 구현
   - setup_project
   - inject_harness (search_pattern + match_strategy)
   - run_evaluation (화이트리스트 강제)
   - write_activity_log
   - check_idle_time
3. 보안 정책 적용 (Path Restriction + Command Whitelist)
```

### Step 3 — VS Code Extension
```
1. Extension 프로젝트 생성 (TypeScript)
2. 사이드바 UI 구현 (Wing 채팅창 + 비행테스트 버튼)
3. MCP 서버 연동
4. Claude Sonnet API 연결 + wing_system_prompt.md 주입
5. 힌트 3단계 로직 구현
   - HARNESS_ERROR 3회 → 1단계
   - 5분 정체 → 2단계
   - 명시적 요청 → 3단계
```

### Step 4 — Daedalus Console (강사용 웹)
```
1. Next.js 프로젝트 생성
2. STT 실시간 텍스트 표시 영역
3. 지식 카드 편집 UI
4. 배포 버튼 → POST /lesson/sync 호출
5. 학급 이해도 현황판
```

### Step 5 — Insight 분석 엔진
```
1. activity_log 타임스탬프 기반 집중/이탈 시간 계산
2. session_aptitude 점수 산출 로직
3. user_profile 누적 평균 업데이트
4. career_identity 태그 부여 (5회 이상 + 1.5배 이상 조건)
5. RED_FLAG 감지 → POST /alert/redflag
```

### Step 6 — Insight Dashboard (멘토/운영자용)
```
1. 학생별 적성 방사형 차트 (Recharts Radar)
2. 이탈 위험군 리스트
3. career_identity 태그 표시
4. 세션별 분석 리포트 뷰
```

---

## 8. 절대 하지 말 것

- `run_evaluation`에서 화이트리스트 외 명령어 실행
- `inject_harness`에서 라인 넘버 기반 치환 (search_pattern 사용할 것)
- VS Code 기본 Run 버튼 가로채기 시도 (Wing 전용 버튼 사용)
- duration_seconds를 Extension에서 계산하여 로그에 포함
- 한 번에 전체 시스템 구현 시도

---

## 9. 참조 파일 목록

```
docs/
├── lesson_context.json       — 데이터 스키마
├── activity_log.json         — 데이터 스키마
├── user_profile.json         — 데이터 스키마
├── wing_system_prompt.md     — Wing 에이전트 지침
├── myday_system_prompt.md    — MyDay 에이전트 지침
├── insight_system_prompt.md  — Insight 에이전트 지침
├── mcp_spec.md               — MCP 도구 명세
├── api_endpoints.md          — API 엔드포인트 명세
├── tech_stack.md             — 기술 스택 및 배포 전략
└── claude_code_brief.md      — 이 파일 (마스터 명령서)
```
