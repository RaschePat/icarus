/**
 * HintEngine — Wing 3단계 힌트 로직
 *
 * 단계 진입 조건 (wing_system_prompt.md 준수):
 *   1단계: HARNESS_ERROR 3회 이상
 *   2단계: 1단계 노출 후 5분 이상 정체 (입력 변화 없음)
 *   3단계: 수강생이 명시적으로 "힌트" 요청 시만
 *
 * 추가 정책:
 *   - 15분 정체 → 힌트 없이 응원 메시지
 */

export interface HintResult {
  level: 1 | 2 | 3;
  message: string;
}

const HINT_MESSAGES: Record<1 | 2 | 3, string> = {
  1: "정렬 기준을 정하는 Comparator 인터페이스가 필요해 보입니다. 어떤 기준으로 비교할지 먼저 생각해보세요.",
  2: "Java 공식 문서의 Collections.sort 사용법을 참고해보세요.",
  3: "Collections.sort(list, (a, b) -> { ... }); 형태의 뼈대를 만들어보세요.",
};

const CHEER_MESSAGE =
  "잠깐 쉬고 다시 보면 보일 수도 있어요. 천천히 해도 괜찮아요. ✈";

const HARNESS_ERROR_THRESHOLD = 3;
const IDLE_STAGE2_MS = 5 * 60 * 1000;   // 5분
const IDLE_CHEER_MS  = 15 * 60 * 1000;  // 15분

export class HintEngine {
  private _harnessErrors = 0;
  private _currentLevel: 0 | 1 | 2 | 3 = 0;
  private _stage1ExposedAt?: number;       // 1단계 노출 시각
  private _lastInputAt: number = Date.now();

  // ActivityTracker가 입력 감지 시 호출
  recordInput() {
    this._lastInputAt = Date.now();
  }

  // 비행테스트 실패 시 호출
  recordHarnessError() {
    this._harnessErrors++;
  }

  // 수강생이 "힌트" 명시적 요청 시 호출
  requestExplicitHint(): HintResult | null {
    if (this._currentLevel >= 2) {
      this._currentLevel = 3;
      return { level: 3, message: HINT_MESSAGES[3] };
    }
    return null;
  }

  /**
   * 매 메시지 전송 / 비행테스트 완료 시 호출.
   * 조건이 충족되면 HintResult 반환, 아니면 null.
   */
  getHintIfReady(): HintResult | null {
    const now = Date.now();
    const idleMs = now - this._lastInputAt;

    // 15분 정체 → 응원 (힌트 아님)
    if (idleMs >= IDLE_CHEER_MS) {
      return { level: 1, message: CHEER_MESSAGE }; // level 재사용, UI에선 system 메시지로 표시
    }

    // 1단계: 에러 3회 이상 & 아직 미노출
    if (this._harnessErrors >= HARNESS_ERROR_THRESHOLD && this._currentLevel < 1) {
      this._currentLevel = 1;
      this._stage1ExposedAt = now;
      return { level: 1, message: HINT_MESSAGES[1] };
    }

    // 2단계: 1단계 노출 후 5분 정체
    if (
      this._currentLevel === 1 &&
      this._stage1ExposedAt &&
      now - this._stage1ExposedAt >= IDLE_STAGE2_MS
    ) {
      this._currentLevel = 2;
      return { level: 2, message: HINT_MESSAGES[2] };
    }

    return null;
  }

  reset() {
    this._harnessErrors = 0;
    this._currentLevel = 0;
    this._stage1ExposedAt = undefined;
    this._lastInputAt = Date.now();
  }
}
