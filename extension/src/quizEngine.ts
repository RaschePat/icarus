/**
 * quizEngine.ts — 퀴즈 상태 머신
 *
 * - quiz_pool(lesson_context.json)을 로드
 * - 한 번에 한 문항씩 표시
 * - 오답이어도 제출 가능 (명세 준수)
 * - attempt_count: 같은 문항을 재시도할 때마다 증가
 */

export interface QuizItem {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
}

/** WebView로 전달하는 퀴즈 표시 상태 */
export interface QuizDisplay {
  quiz_id:       string;
  question:      string;
  options:       string[];
  attempt_count: number;
  answered:      boolean;
  selected_index: number | null;
  is_correct:    boolean | null;
  /** 정답 인덱스 — 제출 후에만 채워진다 */
  answer_index:  number | null;
  current:       number;   // 1-based
  total:         number;
  complete:      boolean;
}

export class QuizEngine {
  private _pool:         QuizItem[] = [];
  private _index:        number = 0;
  private _attempts:     number = 0;   // 현재 문항의 시도 횟수
  private _answered:     boolean = false;
  private _selectedIdx:  number | null = null;
  private _isCorrect:    boolean | null = null;

  /** quiz_pool 전체를 로드하고 첫 문항으로 초기화 */
  load(pool: QuizItem[]): void {
    this._pool        = [...pool];
    this._index       = 0;
    this._attempts    = 0;
    this._answered    = false;
    this._selectedIdx = null;
    this._isCorrect   = null;
  }

  get isLoaded(): boolean { return this._pool.length > 0; }
  get isComplete(): boolean { return this._index >= this._pool.length; }

  /** 현재 문항의 WebView 표시 데이터 반환. 퀴즈가 없으면 null */
  getDisplay(): QuizDisplay | null {
    if (!this.isLoaded) return null;

    const complete = this.isComplete;
    const item = complete ? this._pool[this._pool.length - 1] : this._pool[this._index];

    return {
      quiz_id:       item.id,
      question:      item.question,
      options:       item.options,
      attempt_count: this._attempts,
      answered:      this._answered,
      selected_index: this._selectedIdx,
      is_correct:    this._isCorrect,
      answer_index:  this._answered ? item.answer_index : null,
      current:       Math.min(this._index + 1, this._pool.length),
      total:         this._pool.length,
      complete,
    };
  }

  /**
   * 선택지 제출 — 오답이어도 항상 처리합니다.
   * @returns { is_correct, attempt_count, quiz_id } — QUIZ_RESULT 로그용
   */
  submit(selectedIndex: number): { is_correct: boolean; attempt_count: number; quiz_id: string } {
    if (this.isComplete) throw new Error("모든 퀴즈가 완료되었습니다.");

    const item = this._pool[this._index];
    this._attempts++;
    this._selectedIdx = selectedIndex;
    this._isCorrect   = selectedIndex === item.answer_index;
    this._answered    = true;

    return {
      is_correct:    this._isCorrect,
      attempt_count: this._attempts,
      quiz_id:       item.id,
    };
  }

  /** 다음 문항으로 이동. 완료 상태이면 null 반환 */
  next(): QuizDisplay | null {
    if (!this._answered) return this.getDisplay();

    this._index++;
    this._attempts    = 0;
    this._answered    = false;
    this._selectedIdx = null;
    this._isCorrect   = null;

    return this.getDisplay();
  }
}
