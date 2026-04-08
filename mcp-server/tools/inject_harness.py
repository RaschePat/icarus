"""
inject_harness — search_pattern을 찾아 Harness 빈칸으로 치환합니다.
match_strategy: first_occurrence (기본) | all_occurrences
"""
from security import resolve_safe_path

_BLANK_TEMPLATE = (
    "// [Harness Blank] logic_id: {logic_id}\n"
    "// [Wing Mission] 이 부분에 오늘 배운 핵심 로직을 구현하세요."
)


def run(
    file_path: str,
    logic_id: str,
    search_pattern: str,
    match_strategy: str = "first_occurrence",
) -> dict:
    if match_strategy not in ("first_occurrence", "all_occurrences"):
        raise ValueError(
            f"지원하지 않는 match_strategy: '{match_strategy}'. "
            "허용 값: first_occurrence | all_occurrences"
        )

    target = resolve_safe_path(file_path)
    if not target.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

    original = target.read_text(encoding="utf-8")
    blank = _BLANK_TEMPLATE.format(logic_id=logic_id)

    if search_pattern not in original:
        raise ValueError(
            f"search_pattern을 파일에서 찾을 수 없습니다: '{search_pattern}'"
        )

    if match_strategy == "first_occurrence":
        replaced = original.replace(search_pattern, blank, 1)
        count = 1
    else:
        replaced = original.replace(search_pattern, blank)
        count = original.count(search_pattern)

    target.write_text(replaced, encoding="utf-8")

    return {
        "status": "injected",
        "file_path": file_path,
        "logic_id": logic_id,
        "match_strategy": match_strategy,
        "replaced_count": count,
    }
