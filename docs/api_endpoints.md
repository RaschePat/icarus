# ICARUS API Endpoints (FastAPI)

## 1. Base URL
- **MVP (로컬/데모)**: `http://localhost:8000/v1`
- **배포**: `https://{Railway_URL}/v1`

## 2. Endpoints

### [POST] /lesson/sync
- **역할**: 강사(MyDay)가 생성한 지식 컨텍스트를 서버에 업로드.
- **Request Body**: `lesson_context.json` 포맷 데이터
- **Response**: `200 OK { "status": "synced", "lesson_id": "..." }`

### [GET] /lesson/{lesson_id}
- **역할**: Wing 익스텐션이 실행 시 필요한 지식 카드를 다운로드.
- **Response**: `lesson_context.json` 포맷 데이터

### [POST] /activity/log
- **역할**: 익스텐션에서 수집된 세션 로그를 분석 엔진으로 전송.
- **Request Body**: `activity_log.json` 포맷 데이터
- **Response**: `200 OK { "status": "received" }`

### [GET] /user/profile/{user_id}
- **역할**: 웹 대시보드에 표시할 누적 적성 데이터 및 아이덴티티 조회.
- **Response**: `user_profile.json` 포맷 데이터

### [GET] /insight/report/{session_id}
- **역할**: 특정 세션에 대한 상세 분석 리포트 요청.
- **Response**: `{ "radar_data": [...], "ai_comment": "..." }`

### [POST] /alert/redflag
- **역할**: Insight가 이탈 위험 감지 시 멘토에게 Slack 알림 전송.
- **Request Body**: `{ "user_id": "...", "reason": "...", "severity": "HIGH | MID" }`
- **Response**: `200 OK { "status": "sent" }`
