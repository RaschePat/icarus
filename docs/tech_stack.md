# ICARUS Tech Stack & Model Tiering

## 1. Model Tiering Strategy
비용 효율성과 성능 극대화를 위해 역할별 하이브리드 모델을 적용합니다.

| Component | Model | Reason |
| :--- | :--- | :--- |
| **Wing (Coding)** | Claude 3.5 Sonnet | MCP 원천 설계 모델. 코드 생성 및 Instruction Following 최적화 |
| **MyDay (STT/Summary)** | Gemini 1.5 Flash | 대량 실시간 텍스트 처리 속도 및 비용 효율성 |
| **Insight (Analytics)** | Gemini 1.5 Flash | 장기 행동 로그 패턴 분석에 유리한 대용량 컨텍스트 윈도우 |

## 2. Component Tech Stack

### 2.1 Extension (Client)
- **Framework**: VS Code Extension API
- **Sidebar UI**: React (WebView)
- **Language**: TypeScript
- **Agent Interface**: MCP (Model Context Protocol)

### 2.2 Dashboard (Web)
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **Charts**: Recharts (Radar / Line Charts)
- **Deployment**: Vercel

### 2.3 Backend Server
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **Deployment**: Railway

### 2.4 STT Pipeline
- **Engine**: Google Cloud Speech-to-Text v2
- **통신**: WebSocket (실시간 스트리밍)

## 3. MVP vs Phase 2 인프라 전략

### Phase 1 (MVP - 공모전 데모)
| 항목 | 선택 | 이유 |
| :--- | :--- | :--- |
| 프론트엔드 배포 | Vercel | GitHub 연동 자동 배포 |
| 백엔드 배포 | Railway | FastAPI 즉시 배포, 설정 최소화 |
| DB | PostgreSQL (Railway 내장) | 별도 설정 불필요 |
| 캐시 | 메모리 (In-memory) | Redis 설정 생략 |
| 파일 저장 | 로컬 JSON | S3 설정 생략 |

### Phase 2 (실서비스)
| 항목 | 선택 |
| :--- | :--- |
| 캐시 | Redis |
| 파일 저장 | AWS S3 |
| 서버 | AWS Lambda (Serverless) |
| CDN | CloudFront |
