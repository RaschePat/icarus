# ICARUS — 교육 현장의 AI 에이전트 시스템

이카루스 신화에서 영감을 받았습니다. 학생에게 날개를 주는 것이 아니라, 학생이 자신의 날개를 직접 만들고 실패하며 성장하는 구조를 만듭니다.

**세 주체가 각자의 이익으로 참여합니다:**
- 🎓 **수강생** → 내가 만들고 싶은 것을 만들며 성취감과 포트폴리오를 얻음
- 👨‍🏫 **교강사** → 데이터로 학생 이해도를 파악하고 수업 방향을 조정함
- 👔 **운영자** → 이탈 위험 학생을 사전 감지하고 적성 기반 취업을 연결함

---

## 🔗 라이브 데모

**배포 URL:** https://icarus-platform.vercel.app

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 운영자 | admin@icarus.com | icarus1234 |
| 강사 | instructor1@icarus.com | icarus1234 |
| 멘토 | mentor1@icarus.com | icarus1234 |
| 학생 | student01@icarus.com | icarus1234 |

### 역할별 주요 화면

- **운영자:** 과정/단원/섹션 생성, 강사 배정
- **강사:** 강의 콘솔 (STT + 지식 카드 배포)
- **멘토:** 학생 적성/관심사/마이크로 프로젝트 대시보드
- **학생:** 수강 과정 목록, 적성 분석

---

## 🏗️ 시스템 구조

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

## 🛠️ 기술 스택

| 계층 | 기술 |
|------|------|
| **Frontend** | Next.js 15 + Tailwind CSS + Shadcn UI |
| **Backend** | FastAPI (Python) + PostgreSQL |
| **Extension** | TypeScript + VS Code Extension API + MCP |
| **배포** | Vercel (프론트) + Railway (백엔드) |
| **STT** | Google Cloud Speech-to-Text v2 |
| **AI** | Claude (Sonnet/Haiku), Gemini Flash |

---

## 📦 프로젝트 구조

```
icarus/
├── platform/           # Next.js 대시보드 (운영자/강사/멘토/학생)
│   ├── app/
│   │   ├── admin/      # 과정/단원/섹션 관리
│   │   ├── instructor/ # 강의 콘솔
│   │   ├── mentor/     # 멘토 대시보드
│   │   └── student/    # 학생 페이지
│   └── components/     # 재사용 UI 컴포넌트
│
├── backend/            # FastAPI 백엔드
│   ├── routers/        # API 엔드포인트
│   ├── models.py       # SQLAlchemy ORM
│   ├── schemas.py      # Pydantic 검증
│   └── scripts/        # 더미 데이터 생성 (seed_data.py)
│
├── extension/          # VS Code Wing Extension
│   ├── src/
│   │   ├── extension.ts   # 진입점
│   │   ├── claudeClient.ts # Claude 통신
│   │   └── activityTracker.ts # 활동 로깅
│   └── package.json
│
└── docs/               # 설계 문서 & 스키마
```

---

## 🚀 Wing Extension 실행

### 1. 개발 모드 실행

```bash
# VS Code에서 extension/ 폴더 열기
code extension/

# F5 눌러서 개발 모드 실행 (새 VS Code 창 열림)
```

### 2. 설정 필요

VS Code 설정 (`settings.json`)에서 다음을 추가하세요:

```json
"wing.backendUrl": "https://icarus-production-23db.up.railway.app",
"wing.userId": "user-6682ba45",
"wing.userToken": "YOUR_JWT_TOKEN_HERE"
```

**토큰 얻는 방법:**
1. https://icarus-platform.vercel.app/login 에서 학생 계정으로 로그인
2. 브라우저 개발자 도구 → Application → Cookies → `next-auth.session-token` 복사

### 3. 기능 확인

- ✅ STT 텍스트 실시간 입력
- ✅ 빈칸 자동 주입 및 평가
- ✅ 3단계 힌트 시스템
- ✅ 활동 로그 기록

---

## 📚 API 문서

### 주요 엔드포인트

#### 인증
- `POST /v1/auth/register` - 회원가입
- `POST /v1/auth/login` - 로그인

#### 과정 관리
- `GET /v1/courses` - 과정 목록
- `POST /v1/courses` - 과정 생성
- `DELETE /v1/courses/{course_id}` - 과정 삭제

#### 멘토 기능
- `GET /v1/mentor/students` - 담당 학생 목록
- `GET /v1/mentor/students/{userId}/detail` - 학생 상세 정보
- `POST /v1/mentor/students` - 학생 배정

#### 사용자 프로필
- `POST /v1/user/profile/{user_id}` - 프로필 생성/업데이트
- `GET /v1/lesson/{lesson_id}` - 수업 정보 조회

---

## 🗄️ 데이터 모델

### UserProfile (누적 적성 정보)

```python
{
  "user_id": "user-xxx",
  "logic_avg": 65.5,           # 논리력 (0-100)
  "planning_avg": 72.3,        # 계획력
  "ux_avg": 58.9,              # UI/UX 감각
  "data_avg": 61.2,            # 데이터 분석력
  "session_count": 15,         # 누적 세션 수
  "career_identity": ["#Logic", "#Data"],  # 확정된 진로 정체성
  "interest_profile": {
    "top_category": "게임",
    "category_counts": {"게임": 25, "교육": 12},
    "top_keywords": ["Unity", "AI"],
    "keyword_freq": {"Unity": 8, "AI": 6}
  }
}
```

### ActivityLog (세션 활동 기록)

```python
{
  "session_id": "session-xxx",
  "user_id": "user-xxx",
  "timestamp_start": "2026-04-12T10:30:00Z",
  "logs": [
    {"type": "INPUT_TYPE", "data": "System.out.println", "ts": 1234567890},
    {"type": "FOCUS_CHANGE", "data": "editor", "ts": 1234567891}
  ],
  "session_aptitude": {
    "logic_score": 72,
    "planning_score": 68,
    "ux_score": 55,
    "data_score": 61
  }
}
```

---

## 🔐 환경 변수

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost/icarus
ANTHROPIC_API_KEY=sk-...
GOOGLE_CLOUD_SPEECH_API_KEY=...
SECRET_KEY=icarus-dev-secret
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://icarus-production-23db.up.railway.app
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://icarus-platform.vercel.app
```

---

## 📖 주요 문서

| 문서 | 설명 |
|------|------|
| `docs/claude_code_brief.md` | 마스터 명령서 (구현 순서, 절대 하지 말 것) |
| `docs/mcp_spec.md` | MCP 도구 명세 (setup_project, inject_harness 등) |
| `docs/wing_system_prompt.md` | Wing 에이전트 지침 |
| `docs/api_endpoints.md` | API 전체 엔드포인트 명세 |

---

## 🤝 기여 가이드

1. **기능 추가:** 먼저 `docs/claude_code_brief.md`의 "구현 순서"를 읽으세요
2. **절대 금지:** 라인 넘버 기반 주입, 화이트리스트 외 명령어 실행, 일괄 구현
3. **테스트:** 각 단계별로 먼저 테스트한 후 다음 단계로 진행

---

## 📞 연락처

- **개발:** @mixer_g2
- **GitHub:** https://github.com/RaschePat/icarus
- **Vercel:** https://icarus-platform.vercel.app

---

**마지막 업데이트:** 2026-04-12
