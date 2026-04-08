"""
보안 정책 모듈
- Path Restriction : ICARUS_PROJECT_ROOT 외부 접근 차단
- Command Whitelist: javac/java/python/node 포맷만 허용
"""
import os
import re
from pathlib import Path

# --- Path Restriction ---

def get_project_root() -> Path:
    root = os.environ.get("ICARUS_PROJECT_ROOT", "")
    if not root:
        raise EnvironmentError("ICARUS_PROJECT_ROOT 환경변수가 설정되지 않았습니다.")
    return Path(root).resolve()


def resolve_safe_path(raw_path: str) -> Path:
    """
    raw_path를 절대경로로 변환하고, ICARUS_PROJECT_ROOT 내부인지 검증합니다.
    벗어나면 PermissionError를 발생시킵니다.
    """
    root = get_project_root()
    target = (root / raw_path).resolve()
    # Path Traversal 방지
    if not str(target).startswith(str(root)):
        raise PermissionError(
            f"경로 접근 거부: '{raw_path}' 는 프로젝트 루트 밖입니다."
        )
    return target


# --- Command Whitelist ---

# 허용 패턴: (컴파일러/인터프리터, 파일/클래스 인자)
_WHITELIST_PATTERNS = [
    re.compile(r"^javac\s+[\w/.\-]+\.java$"),
    re.compile(r"^java\s+[\w.\-]+$"),
    re.compile(r"^python\s+[\w/.\-]+\.py$"),
    re.compile(r"^node\s+[\w/.\-]+\.js$"),
]


def validate_command(command: str) -> None:
    """
    화이트리스트에 없는 명령어는 즉시 차단합니다.
    통과하면 None, 위반하면 ValueError를 발생시킵니다.
    """
    cmd = command.strip()
    for pattern in _WHITELIST_PATTERNS:
        if pattern.match(cmd):
            return
    raise ValueError(
        f"허용되지 않은 명령어: '{cmd}'. "
        "허용 목록: javac <file>.java | java <class> | python <file>.py | node <file>.js"
    )
