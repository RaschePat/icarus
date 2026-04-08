"""
run_evaluation — 화이트리스트 명령어로 코드를 실행하고 결과를 반환합니다.
허용: javac <file>.java | java <class> | python <file>.py | node <file>.js
"""
import subprocess

from security import resolve_safe_path, get_project_root, validate_command


def run(file_path: str, command: str) -> dict:
    # 1. 명령어 화이트리스트 검증
    validate_command(command)

    # 2. 파일 경로가 포함된 경우 Path Restriction 검증
    #    (javac/python/node 의 첫 번째 인자가 파일 경로)
    parts = command.strip().split(maxsplit=1)
    executable = parts[0]
    if executable in ("javac", "python", "node") and file_path:
        resolve_safe_path(file_path)

    # 3. 실행 (프로젝트 루트를 cwd로 설정)
    cwd = str(get_project_root())
    try:
        result = subprocess.run(
            command,
            shell=False,           # shell=False: 쉘 메타문자 인젝션 방지
            args=command.split(),
            capture_output=True,
            text=True,
            timeout=15,
            cwd=cwd,
        )
        return {
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    except subprocess.TimeoutExpired:
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": "실행 시간이 15초를 초과하여 강제 종료되었습니다.",
        }
