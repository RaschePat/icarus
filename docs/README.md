# ICARUS — AI 기반 차세대 교육 시스템

> "이카루스는 실패한 것이 아니다. 어떤 인간보다 태양에 가까이 닿은 자다."

ICARUS는 IT 부트캠프의 교육 구조를 바꾸는 AI 에이전트 시스템입니다.
학생에게 날개를 주는 것이 아니라, 학생이 자신의 날개를 직접 만들고
실패하며 성장하는 구조를 만듭니다.

---

## 핵심 문제 의식

| 대상 | 문제 |
| :--- | :--- |
| 수강생 | AI가 짜준 코드를 이해 없이 사용하다 실무에서 추락 |
| 교강사 | 침묵하는 교실 — 어디서 막히는지 알 수 없음 |
| 운영자 | 이탈 신호를 사전에 감지할 수단 없음 |

---

## 시스템 구조

```
[강사 음성]
    ↓ STT (Google Cloud STT v2)
[MyDay — Gemini Flash]
    강의 핵심 개념 추출 + 강사 승인
    ↓ lesson_context.json 배포
[Central Hub — FastAPI]
    ↓
[Wing — Claude Sonnet + MCP]
    마이크로 프로젝트 생성 + 빈칸 주입 + 힌트 제어
    ↓ activity_log.json
[Insight — Gemini Flash]
    행동 로그 분석 + 적성 판별 + RED_FLAG 감지
    ↓
[Insight Dashboard — Next.js]
    멘토/운영자용 대시보드
```

---

## 핵심 기능

### Wing (학생용 VS Code Extension)
- 학생의 관심사 기반 마이크로 프로젝트 자동 생성
- 오늘 배운 핵심 로직 위치에 빈칸 자동 주입
- 힌트 3단계 원칙으로 자립적 학습 유도
  - 에러 3회 → 개념 방향 힌트
  - 5분 정체 → 참조 가이드
  - 명시적 요청 → 구조적 힌트

### Daedalus Console (강사용 웹)
- 수업 음성 실시간 STT 변환
- AI 추출 지식 카드 검토 및 편집
- 원클릭 배포 → 전체 학생 Wing에 동기화

### Insight Dashboard (멘토/운영자용)
- 학생별 적성 방사형 차트
- 이탈 위험군 사전 감지 (RED_FLAG)
- 마이크로 프로젝트 기반 진로 성향 분석
  - 개발형 / 기획형 / UX형 / 데이터형

---

## 기술 스택

| 영역 | 기술 |
| :--- | :--- |
| Wing 에이전트 | Claude 3.5 Sonnet + MCP |
| MyDay 에이전트 | Gemini 1.5 Flash |
| Insight 에이전트 | Gemini 1.5 Flash |
| Extension | TypeScript + VS Code Extension API |
| 웹 대시보드 | Next.js + Tailwind CSS + Recharts |
| 백엔드 | FastAPI (Python) + PostgreSQL |
| STT | Google Cloud Speech-to-Text v2 |
| 배포 | Vercel (프론트) + Railway (백엔드) |

---

## 데모

> 데모 영상 링크 추가 예정

### 라이브 URL
- 강사 콘솔: 추가 예정
- 멘토 대시보드: 추가 예정

---

## 프로젝트 구조

```
icarus/
├── docs/                        # AI 협업 기획 문서
│   ├── claude_code_brief.md     # Claude Code 실행 명령서
│   ├── lesson_context.json      # 데이터 스키마
│   ├── activity_log.json        # 데이터 스키마
│   ├── user_profile.json        # 데이터 스키마
│   ├── wing_system_prompt.md    # Wing 에이전트 지침
│   ├── myday_system_prompt.md   # MyDay 에이전트 지침
│   ├── insight_system_prompt.md # Insight 에이전트 지침
│   ├── mcp_spec.md              # MCP 도구 명세
│   ├── api_endpoints.md         # API 엔드포인트 명세
│   └── tech_stack.md            # 기술 스택 및 배포 전략
├── extension/                   # VS Code Extension (Wing)
├── dashboard/                   # Next.js 웹 대시보드
├── backend/                     # FastAPI 서버
└── README.md
```

---

## 로컬 실행 방법

### 백엔드
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 대시보드
```bash
cd dashboard
npm install
npm run dev
```

### Extension
```bash
cd extension
npm install
# VS Code에서 F5로 Extension 개발 모드 실행
```

---

## AI 협업 기획 과정

본 프로젝트는 Claude와 Gemini를 활용한 AI 협업 기획으로 설계되었습니다.

- **Claude**: 서비스 철학, 페인포인트 분석, 시스템 프롬프트 설계, 문서 검토
- **Gemini**: 기술 명세서, 데이터 스키마 구체화, 에이전트 로직 설계

기획 문서 전체는 `docs/` 폴더에서 확인하실 수 있습니다.

---

## 팀 정보

- **참가자**: 김민석
- **공모전**: 2026 KIT 바이브코딩 공모전
- **주제**: AI 활용 차세대 교육 솔루션
