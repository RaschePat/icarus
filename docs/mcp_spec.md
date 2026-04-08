# ICARUS MCP Specification

## 1. Overview
Claude(Wing) 에이전트가 수강생의 로컬 PC에서 안전하게 코드를 생성, 주입, 실행하기 위한
전용 도구 세트입니다.

## 2. Tools Definition

| Tool Name | Arguments | Description |
| :--- | :--- | :--- |
| `setup_project` | `path: string`, `template: string` | 지정된 경로에 기초 프로젝트 구조를 생성합니다. |
| `inject_harness` | `file_path: string`, `logic_id: string`, `search_pattern: string`, `match_strategy: string` | `search_pattern`을 찾아 빈칸으로 치환합니다. |
| `run_evaluation` | `file_path: string`, `command: string` | 화이트리스트 기반 명령어로 코드를 실행하고 결과를 반환합니다. |
| `write_activity_log` | `event_json: object` | 타임스탬프를 포함한 행동 로그를 `activity_log.json`에 기록합니다. |
| `check_idle_time` | - | 마지막 사용자 입력 이벤트 이후 경과된 시간(초)을 반환합니다. |

## 3. Detailed Logic: inject_harness

### match_strategy
- **`first_occurrence` (Default)**: 파일 내에서 가장 처음 발견되는 패턴 하나만 치환합니다. (MVP 권장)
- **`all_occurrences`**: 파일 내 일치하는 모든 패턴을 치환합니다.

### 치환 결과 형식
```
// [Harness Blank] logic_id: {logic_id}
// [Wing Mission] 이 부분에 오늘 배운 핵심 로직을 구현하세요.
```

## 4. Security Policy

### Command Whitelist
`run_evaluation`은 다음 포맷만 실행 가능하며, 이외의 입력은 즉시 Reject 처리합니다.
- `javac {file}`, `java {class}`
- `python {file}`
- `node {file}`

### Path Restriction
`icarus-project/` 루트 디렉토리를 벗어나는 모든 파일 접근(Path Traversal)을 금지합니다.
상위 디렉토리 접근 시도(`../`) 는 즉시 차단합니다.
