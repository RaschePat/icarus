"""
setup_project — 지정된 경로에 기초 프로젝트 구조를 생성합니다.
지원 템플릿: java | python | node
"""
from pathlib import Path

from security import resolve_safe_path

# 템플릿별 생성할 파일 구조
_TEMPLATES: dict[str, dict[str, str]] = {
    "java": {
        "src/Main.java": (
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        // TODO: 여기에 코드를 작성하세요\n"
            "    }\n"
            "}\n"
        ),
        "README.md": "# Java Project\n",
    },
    "python": {
        "main.py": "# TODO: 여기에 코드를 작성하세요\n",
        "README.md": "# Python Project\n",
    },
    "node": {
        "index.js": "// TODO: 여기에 코드를 작성하세요\n",
        "package.json": (
            '{\n'
            '  "name": "icarus-project",\n'
            '  "version": "1.0.0",\n'
            '  "main": "index.js"\n'
            '}\n'
        ),
        "README.md": "# Node Project\n",
    },
}


def run(path: str, template: str) -> dict:
    if template not in _TEMPLATES:
        raise ValueError(
            f"지원하지 않는 템플릿: '{template}'. 지원 목록: {list(_TEMPLATES.keys())}"
        )

    project_root = resolve_safe_path(path)
    project_root.mkdir(parents=True, exist_ok=True)

    created: list[str] = []
    for rel_path, content in _TEMPLATES[template].items():
        target = project_root / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        created.append(rel_path)

    return {
        "status": "created",
        "path": str(project_root),
        "template": template,
        "files": created,
    }
