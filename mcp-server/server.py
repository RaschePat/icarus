"""
ICARUS MCP Server
Wing(Claude) 에이전트가 수강생 로컬 PC에서 안전하게 코드를 생성·주입·실행하기 위한 도구 서버입니다.
실행: python server.py  (stdio transport)
"""
import json
import os

from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

import tools.setup_project as setup_project
import tools.inject_harness as inject_harness
import tools.run_evaluation as run_evaluation
import tools.write_activity_log as write_activity_log
import tools.check_idle_time as check_idle_time

load_dotenv()

app = Server("icarus-wing-mcp")


# ── 도구 목록 노출 ────────────────────────────────────────────────────────────

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="setup_project",
            description="지정된 경로에 기초 프로젝트 구조를 생성합니다. 프로젝트 루트 외부 접근은 금지됩니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "path":     {"type": "string", "description": "생성할 프로젝트 경로 (루트 기준 상대경로)"},
                    "template": {"type": "string", "enum": ["java", "python", "node"], "description": "프로젝트 템플릿"},
                },
                "required": ["path", "template"],
            },
        ),
        types.Tool(
            name="inject_harness",
            description=(
                "파일에서 search_pattern을 찾아 Harness 빈칸 주석으로 치환합니다. "
                "라인 넘버 기반 치환은 사용하지 않습니다."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path":      {"type": "string", "description": "대상 파일 경로 (루트 기준 상대경로)"},
                    "logic_id":       {"type": "string", "description": "Harness 식별자"},
                    "search_pattern": {"type": "string", "description": "치환할 정확한 코드 문자열"},
                    "match_strategy": {
                        "type": "string",
                        "enum": ["first_occurrence", "all_occurrences"],
                        "description": "치환 전략 (기본값: first_occurrence)",
                    },
                },
                "required": ["file_path", "logic_id", "search_pattern"],
            },
        ),
        types.Tool(
            name="run_evaluation",
            description=(
                "화이트리스트 기반 명령어(javac/java/python/node)로 코드를 실행하고 결과를 반환합니다. "
                "화이트리스트 외 명령어는 즉시 거부됩니다."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "실행할 파일 경로 (루트 기준 상대경로)"},
                    "command":   {"type": "string", "description": "실행 명령어 (예: 'python main.py')"},
                },
                "required": ["file_path", "command"],
            },
        ),
        types.Tool(
            name="write_activity_log",
            description=(
                "타임스탬프를 포함한 행동 로그를 activity_log.json에 기록합니다. "
                "duration_seconds는 Extension에서 계산하여 전달하지 않습니다."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "event_json": {
                        "type": "object",
                        "description": "기록할 이벤트 객체 (event_type, data 포함)",
                    },
                },
                "required": ["event_json"],
            },
        ),
        types.Tool(
            name="check_idle_time",
            description="마지막 INPUT_TYPE 이벤트 이후 경과된 시간(초)을 반환합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
    ]


# ── 도구 실행 ────────────────────────────────────────────────────────────────

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        if name == "setup_project":
            result = setup_project.run(
                path=arguments["path"],
                template=arguments["template"],
            )

        elif name == "inject_harness":
            result = inject_harness.run(
                file_path=arguments["file_path"],
                logic_id=arguments["logic_id"],
                search_pattern=arguments["search_pattern"],
                match_strategy=arguments.get("match_strategy", "first_occurrence"),
            )

        elif name == "run_evaluation":
            result = run_evaluation.run(
                file_path=arguments["file_path"],
                command=arguments["command"],
            )

        elif name == "write_activity_log":
            result = write_activity_log.run(
                event_json=arguments["event_json"],
            )

        elif name == "check_idle_time":
            result = check_idle_time.run()

        else:
            result = {"error": f"알 수 없는 도구: {name}"}

    except (PermissionError, ValueError, FileNotFoundError, EnvironmentError) as e:
        result = {"error": str(e)}

    return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]


# ── 실행 ─────────────────────────────────────────────────────────────────────

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
