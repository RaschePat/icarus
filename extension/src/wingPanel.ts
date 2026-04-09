import * as vscode from "vscode";
import { ClaudeClient } from "./claudeClient";
import { McpClient } from "./mcpClient";
import { HintEngine } from "./hintEngine";
import { QuizEngine, QuizItem } from "./quizEngine";

export type Message = { role: "user" | "wing" | "system"; text: string };

export interface HarnessLogic {
  logic_id: string;
  file_path?: string;      // 미지정 시 템플릿별 기본 파일 사용
  search_pattern: string;
  match_strategy?: string;
}
export interface HarnessConfig {
  target_logic: HarnessLogic[];
}

type PendingProject = { name: string; template: string; description: string };

export class WingPanelProvider implements vscode.WebviewViewProvider {
  public static readonly VIEW_ID = "wing.chatPanel";

  private _view?: vscode.WebviewView;
  private _messages: Message[] = [];
  private _quiz = new QuizEngine();
  private _harnessConfig: HarnessConfig | null = null;
  private _pendingProject: PendingProject | null = null;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _claude: ClaudeClient,
    private readonly _mcp: McpClient,
    private readonly _hint: HintEngine
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = this._buildHtml(webviewView.webview);

    // WebView → Extension 메시지 처리
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "userMessage":
          await this._handleUserMessage(msg.text);
          break;
        case "flightTest":
          await this._handleFlightTest(msg.filePath, msg.command);
          break;
        case "clearChat":
          this._messages = [];
          this._postMessages();
          break;
        case "quizSubmit":
          await this._handleQuizSubmit(msg.selectedIndex);
          break;
        case "quizNext":
          this._postQuiz();
          break;
        case "projectConfirm":
          await this._handleProjectConfirm();
          break;
        case "projectCancel":
          this._pendingProject = null;
          this._view?.webview.postMessage({ type: "projectProposalDismiss" });
          this._addMessage({ role: "wing", text: "프로젝트 생성을 취소했습니다. 언제든 다시 말해주세요!" });
          break;
      }
    });
  }

  /** lesson_context의 harness_config를 저장 */
  public setHarnessConfig(config: HarnessConfig): void {
    this._harnessConfig = config;
  }

  /** lesson_context의 quiz_pool을 로드하고 WebView에 첫 문항 전송 */
  public loadQuiz(pool: QuizItem[]): void {
    this._quiz.load(pool);
    this._postQuiz();
  }

  // 외부에서 시스템 메시지 추가 (힌트 엔진 등)
  public pushSystemMessage(text: string) {
    this._addMessage({ role: "system", text });
  }

  // 비행테스트 버튼 — Extension Command에서 직접 호출 가능
  public async runFlightTest(filePath: string, command: string) {
    await this._handleFlightTest(filePath, command);
  }

  private async _handleUserMessage(text: string) {
    this._addMessage({ role: "user", text });

    // 마이크로 프로젝트 생성 의도 감지
    if (/만들(고\s*싶|래|어볼까|겠어)/.test(text)) {
      await this._handleProjectIntent(text);
      return;
    }

    // 요청 카테고리 분류 및 WING_REQUEST 로그는 ClaudeClient 내부에서 처리
    const reply = await this._claude.chat(text, this._messages);
    this._addMessage({ role: "wing", text: reply });

    // 힌트 단계 체크
    const hint = this._hint.getHintIfReady();
    if (hint) {
      this._addMessage({ role: "system", text: `[Wing 힌트 ${hint.level}단계] ${hint.message}` });
    }
  }

  private async _handleProjectIntent(text: string) {
    this._addMessage({ role: "system", text: "프로젝트 아이디어를 분석 중…" });
    try {
      const proposal = await this._claude.analyzeProjectIntent(text);
      this._pendingProject = proposal;
      this._view?.webview.postMessage({ type: "projectProposal", data: proposal });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._addMessage({ role: "wing", text: `프로젝트 분석에 실패했습니다: ${msg}` });
    }
  }

  private async _handleProjectConfirm() {
    const proj = this._pendingProject;
    this._pendingProject = null;
    this._view?.webview.postMessage({ type: "projectProposalDismiss" });
    if (!proj) { return; }

    const config = vscode.workspace.getConfiguration("wing");
    const projectRoot: string = config.get("projectRoot") ?? "";
    if (!projectRoot) {
      this._addMessage({ role: "wing", text: "wing.projectRoot 설정이 필요합니다." });
      return;
    }

    const projectPath = `${projectRoot}/${proj.name}`;
    this._addMessage({ role: "system", text: `📁 프로젝트 생성 중: ${projectPath}` });

    try {
      await this._mcp.setupProject(projectPath, proj.template);
      this._addMessage({ role: "wing", text: `✅ '${proj.name}' 프로젝트가 생성됐습니다!\n경로: ${projectPath}` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this._addMessage({ role: "wing", text: `❌ 프로젝트 생성 실패: ${msg}` });
      return;
    }

    // harness_config 기반 빈칸 주입
    const harness = this._harnessConfig;
    if (!harness || harness.target_logic.length === 0) {
      this._addMessage({ role: "wing", text: "프로젝트가 준비됐습니다! 이제 코딩을 시작하세요 🚀" });
      return;
    }

    this._addMessage({ role: "system", text: "🔧 학습 빈칸(Harness) 주입 중…" });
    const defaultFile = proj.template === "java" ? "src/Main.java"
      : proj.template === "node" ? "index.js" : "main.py";

    let injected = 0;
    for (const logic of harness.target_logic) {
      try {
        await this._mcp.injectHarness(
          logic.file_path ?? defaultFile,
          logic.logic_id,
          logic.search_pattern,
          logic.match_strategy ?? "first_occurrence"
        );
        injected++;
      } catch {
        // 개별 실패는 무시하고 카운트로 보고
      }
    }
    this._addMessage({
      role: "wing",
      text: `✅ 빈칸 주입 완료 (${injected}/${harness.target_logic.length}개)\nWing 미션을 시작하세요! 🚀`,
    });
  }

  private async _handleFlightTest(filePath: string, command: string) {
    this._addMessage({
      role: "system",
      text: `비행테스트 실행 중: \`${command}\``,
    });

    const result = await this._mcp.runEvaluation(filePath, command);
    const success = result.exit_code === 0;

    if (!success) {
      this._hint.recordHarnessError();
    }

    const output = [
      success ? "✅ 통과" : "❌ 실패",
      result.stdout ? `\`\`\`\n${result.stdout.trim()}\n\`\`\`` : "",
      result.stderr ? `오류:\n\`\`\`\n${result.stderr.trim()}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n");

    this._addMessage({ role: "wing", text: output });

    // 실패 후 즉시 힌트 단계 체크
    const hint = this._hint.getHintIfReady();
    if (hint) {
      this._addMessage({ role: "system", text: `[Wing 힌트 ${hint.level}단계] ${hint.message}` });
    }
  }

  private async _handleQuizSubmit(selectedIndex: number) {
    const result = this._quiz.submit(selectedIndex);

    // QUIZ_RESULT 로그 기록
    await this._mcp.writeActivityLog({
      event_type: "QUIZ_RESULT",
      quiz_id:      result.quiz_id,
      is_correct:   result.is_correct,
      attempt_count: result.attempt_count,
    });

    // 정답이면 다음 문항으로 자동 이동
    if (result.is_correct) {
      this._quiz.next();
    }

    this._postQuiz();
  }

  private _postQuiz() {
    const data = this._quiz.getDisplay();
    this._view?.webview.postMessage({ type: "quiz", data });
  }

  private _addMessage(msg: Message) {
    this._messages.push(msg);
    this._postMessages();
  }

  private _postMessages() {
    this._view?.webview.postMessage({ type: "messages", data: this._messages });
  }

  private _buildHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return /* html */ `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src 'nonce-${nonce}';
             script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wing</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    /* ── 헤더 ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      background: var(--vscode-sideBarSectionHeader-background);
    }
    .header-title { font-weight: 600; font-size: 13px; }
    .btn-clear {
      background: none;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .btn-clear:hover { background: var(--vscode-toolbar-hoverBackground); }

    /* ── 채팅 영역 ── */
    .chat-area {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bubble {
      max-width: 90%;
      padding: 8px 12px;
      border-radius: 8px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .bubble.user {
      align-self: flex-end;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-bottom-right-radius: 2px;
    }
    .bubble.wing {
      align-self: flex-start;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-bottom-left-radius: 2px;
    }
    .bubble.system {
      align-self: center;
      background: var(--vscode-editorInfo-background, #1a3a4a);
      color: var(--vscode-editorInfo-foreground, #4fc3f7);
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 12px;
      max-width: 100%;
    }
    .label {
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 3px;
      opacity: 0.7;
    }

    /* ── 프로젝트 제안 카드 ── */
    .project-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-button-background);
      border-radius: 8px;
      padding: 12px 14px;
      margin: 4px 12px;
    }
    .project-card-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--vscode-button-background);
      margin-bottom: 6px;
    }
    .project-card-name {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .project-card-desc {
      font-size: 12px;
      color: var(--vscode-foreground);
      opacity: 0.85;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .project-card-meta {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
    }
    .project-card-actions { display: flex; gap: 6px; }
    .btn-confirm {
      flex: 1;
      padding: 5px 0;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-confirm:hover { background: var(--vscode-button-hoverBackground); }
    .btn-cancel {
      flex: 1;
      padding: 5px 0;
      background: none;
      color: var(--vscode-descriptionForeground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-cancel:hover { background: var(--vscode-toolbar-hoverBackground); }

    /* ── 퀴즈 패널 ── */
    .quiz-panel {
      padding: 10px 12px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
      background: var(--vscode-sideBarSectionHeader-background);
      display: none;
    }
    .quiz-panel.visible { display: block; }
    .quiz-header {
      font-size: 11px;
      font-weight: 700;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }
    .quiz-question {
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }
    .quiz-options { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .quiz-option {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-foreground);
      transition: background 0.1s;
    }
    .quiz-option:hover { background: var(--vscode-list-hoverBackground); }
    .quiz-option.correct { border-color: #4caf50; background: rgba(76,175,80,0.15); color: #4caf50; }
    .quiz-option.wrong   { border-color: #f44336; background: rgba(244,67,54,0.15); color: #f44336; }
    .quiz-option.answer  { border-color: #4caf50; }
    .quiz-option input[type="radio"] { accent-color: var(--vscode-button-background); }
    .quiz-footer { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .quiz-progress { font-size: 10px; color: var(--vscode-descriptionForeground); }
    .quiz-feedback { font-size: 11px; font-weight: 600; }
    .quiz-feedback.ok  { color: #4caf50; }
    .quiz-feedback.ng  { color: #f44336; }
    .btn-quiz {
      padding: 4px 10px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    .btn-quiz:hover { background: var(--vscode-button-hoverBackground); }
    .quiz-complete {
      text-align: center;
      padding: 8px 0;
      font-size: 13px;
      font-weight: 700;
      color: #4caf50;
    }

    /* ── 비행테스트 버튼 ── */
    .flight-bar {
      padding: 8px 12px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      background: var(--vscode-sideBarSectionHeader-background);
    }
    .btn-flight {
      width: 100%;
      padding: 7px 0;
      background: var(--vscode-statusBarItem-warningBackground, #cc6633);
      color: var(--vscode-statusBarItem-warningForeground, #fff);
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-flight:hover { opacity: 0.85; }
    .btn-flight:active { opacity: 0.7; }
    .btn-flight:disabled { opacity: 0.4; cursor: not-allowed; }

    /* 비행테스트 설정 */
    .flight-config {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    .flight-config input {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      padding: 3px 6px;
      font-size: 11px;
    }
    .flight-config input::placeholder { color: var(--vscode-input-placeholderForeground); }

    /* ── 입력 영역 ── */
    .input-area {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      background: var(--vscode-sideBar-background);
    }
    .input-area textarea {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 6px 8px;
      font-family: inherit;
      font-size: 12px;
      resize: none;
      min-height: 60px;
      max-height: 120px;
    }
    .input-area textarea:focus { outline: 1px solid var(--vscode-focusBorder); }
    .btn-send {
      align-self: flex-end;
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-send:hover { background: var(--vscode-button-hoverBackground); }
    .btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
  </style>
</head>
<body>

  <!-- 헤더 -->
  <div class="header">
    <span class="header-title">✈ Wing 부조종사</span>
    <button class="btn-clear" id="btnClear">초기화</button>
  </div>

  <!-- 채팅 영역 -->
  <div class="chat-area" id="chatArea">
    <div class="bubble system">Wing이 준비됐습니다. 오늘 배운 내용을 구현해보세요!</div>
  </div>

  <!-- 퀴즈 패널 -->
  <div class="quiz-panel" id="quizPanel">
    <div class="quiz-header" id="quizHeader">📝 퀴즈</div>
    <div id="quizBody"></div>
  </div>

  <!-- 비행테스트 버튼 -->
  <div class="flight-bar">
    <button class="btn-flight" id="btnFlight">🚀 비행테스트</button>
    <div class="flight-config">
      <input id="inputFilePath" type="text" placeholder="파일 경로 (예: src/Main.java)" />
      <input id="inputCommand"  type="text" placeholder="명령어 (예: javac src/Main.java)" />
    </div>
  </div>

  <!-- 입력 영역 -->
  <div class="input-area">
    <textarea id="txtInput" placeholder="Wing에게 질문하세요…" rows="3"></textarea>
    <button class="btn-send" id="btnSend">전송</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const chatArea  = document.getElementById('chatArea');
    const txtInput  = document.getElementById('txtInput');
    const btnSend   = document.getElementById('btnSend');
    const btnFlight = document.getElementById('btnFlight');
    const btnClear  = document.getElementById('btnClear');
    const inputFilePath = document.getElementById('inputFilePath');
    const inputCommand  = document.getElementById('inputCommand');

    const quizPanel  = document.getElementById('quizPanel');
    const quizHeader = document.getElementById('quizHeader');
    const quizBody   = document.getElementById('quizBody');

    // Extension → WebView 메시지
    let pendingProposal = null;

    window.addEventListener('message', ({ data }) => {
      if (data.type === 'messages')              renderMessages(data.data);
      if (data.type === 'quiz')                  renderQuiz(data.data);
      if (data.type === 'projectProposal')       { pendingProposal = data.data; renderProjectCard(); }
      if (data.type === 'projectProposalDismiss') { pendingProposal = null; document.getElementById('projectProposalCard')?.remove(); }
    });

    function renderProjectCard() {
      document.getElementById('projectProposalCard')?.remove();
      if (!pendingProposal) { return; }
      const p = pendingProposal;
      const wrap = document.createElement('div');
      wrap.id = 'projectProposalCard';
      wrap.innerHTML = \`<div class="project-card">
        <div class="project-card-title">이런 프로젝트 만들어볼까요? ✨</div>
        <div class="project-card-name">📁 \${p.name}</div>
        <div class="project-card-desc">\${p.description}</div>
        <div class="project-card-meta">템플릿: \${p.template}</div>
        <div class="project-card-actions">
          <button class="btn-confirm" id="btnProjConfirm">✅ 만들기</button>
          <button class="btn-cancel"  id="btnProjCancel">취소</button>
        </div>
      </div>\`;
      chatArea.appendChild(wrap);
      chatArea.scrollTop = chatArea.scrollHeight;
      document.getElementById('btnProjConfirm').addEventListener('click', () => {
        pendingProposal = null;
        wrap.remove();
        vscode.postMessage({ type: 'projectConfirm' });
      });
      document.getElementById('btnProjCancel').addEventListener('click', () => {
        pendingProposal = null;
        wrap.remove();
        vscode.postMessage({ type: 'projectCancel' });
      });
    }

    function renderQuiz(d) {
      if (!d) { quizPanel.classList.remove('visible'); return; }
      quizPanel.classList.add('visible');
      quizHeader.textContent = '📝 퀴즈 ' + d.current + ' / ' + d.total;

      if (d.complete) {
        quizBody.innerHTML = '<div class="quiz-complete">🎉 모든 퀴즈 완료!</div>';
        return;
      }

      // 선택지 렌더
      const optionsHtml = d.options.map((opt, i) => {
        let cls = 'quiz-option';
        if (d.answered) {
          if (i === d.answer_index) cls += ' answer';
          if (i === d.selected_index && d.is_correct)  cls += ' correct';
          if (i === d.selected_index && !d.is_correct) cls += ' wrong';
        }
        const disabled = d.answered ? 'disabled' : '';
        const checked  = d.selected_index === i ? 'checked' : '';
        return \`<label class="\${cls}">
          <input type="radio" name="quiz_opt" value="\${i}" \${checked} \${disabled} />
          \${opt}
        </label>\`;
      }).join('');

      const feedbackHtml = d.answered
        ? \`<span class="quiz-feedback \${d.is_correct ? 'ok' : 'ng'}">\${d.is_correct ? '✅ 정답' : '❌ 오답 (재시도 가능)'}</span>\`
        : '';

      const btnHtml = d.answered && d.is_correct
        ? \`<button class="btn-quiz" id="btnQuizNext">\${d.current < d.total ? '다음 문제 →' : '완료'}</button>\`
        : d.answered
        ? \`<button class="btn-quiz" id="btnQuizRetry">다시 시도</button>\`
        : \`<button class="btn-quiz" id="btnQuizSubmit">제출</button>\`;

      quizBody.innerHTML = \`
        <p class="quiz-question">\${d.question}</p>
        <div class="quiz-options">\${optionsHtml}</div>
        <div class="quiz-footer">
          <span class="quiz-progress">시도 \${d.attempt_count}회</span>
          \${feedbackHtml}
          \${btnHtml}
        </div>\`;

      document.getElementById('btnQuizSubmit')?.addEventListener('click', () => {
        const sel = quizBody.querySelector('input[name="quiz_opt"]:checked');
        if (!sel) { return; }
        vscode.postMessage({ type: 'quizSubmit', selectedIndex: Number(sel.value) });
      });
      document.getElementById('btnQuizNext')?.addEventListener('click', () => {
        vscode.postMessage({ type: 'quizNext' });
      });
      document.getElementById('btnQuizRetry')?.addEventListener('click', () => {
        // 선택 초기화 후 재시도 — 단순히 선택 해제
        quizBody.querySelectorAll('input[name="quiz_opt"]').forEach(el => {
          el.disabled = false;
          el.checked  = false;
        });
        quizBody.querySelectorAll('.quiz-option').forEach(el => {
          el.classList.remove('correct', 'wrong', 'answer');
        });
        const footer = quizBody.querySelector('.quiz-footer');
        footer.innerHTML = \`<span class="quiz-progress">시도 \${d.attempt_count}회</span>
          <button class="btn-quiz" id="btnQuizSubmit">제출</button>\`;
        document.getElementById('btnQuizSubmit').addEventListener('click', () => {
          const sel2 = quizBody.querySelector('input[name="quiz_opt"]:checked');
          if (!sel2) { return; }
          vscode.postMessage({ type: 'quizSubmit', selectedIndex: Number(sel2.value) });
        });
      });
    }

    function renderMessages(messages) {
      chatArea.innerHTML = '';
      messages.forEach(({ role, text }) => {
        const wrap = document.createElement('div');
        const label = document.createElement('div');
        const bubble = document.createElement('div');

        label.className = 'label';
        bubble.className = 'bubble ' + role;
        bubble.textContent = text;

        if (role === 'user')   label.textContent = '나';
        if (role === 'wing')   label.textContent = 'Wing';
        if (role === 'system') label.textContent = '';

        if (role !== 'system') wrap.appendChild(label);
        wrap.appendChild(bubble);
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.alignItems = role === 'user' ? 'flex-end' : 'flex-start';
        chatArea.appendChild(wrap);
      });
      chatArea.scrollTop = chatArea.scrollHeight;
      // 메시지 재렌더 후에도 제안 카드 유지
      if (pendingProposal) { renderProjectCard(); }
    }

    function setLoading(on) {
      btnSend.disabled   = on;
      btnFlight.disabled = on;
      btnSend.textContent = on ? '…' : '전송';
    }

    // 전송
    async function sendMessage() {
      const text = txtInput.value.trim();
      if (!text) return;
      txtInput.value = '';
      setLoading(true);
      vscode.postMessage({ type: 'userMessage', text });
      // Extension이 응답 후 messages 이벤트로 갱신
      setTimeout(() => setLoading(false), 500);
    }

    btnSend.addEventListener('click', sendMessage);
    txtInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // 비행테스트
    btnFlight.addEventListener('click', () => {
      const filePath = inputFilePath.value.trim();
      const command  = inputCommand.value.trim();
      if (!filePath || !command) {
        alert('파일 경로와 명령어를 입력하세요.');
        return;
      }
      setLoading(true);
      vscode.postMessage({ type: 'flightTest', filePath, command });
      setTimeout(() => setLoading(false), 500);
    });

    // 초기화
    btnClear.addEventListener('click', () => {
      vscode.postMessage({ type: 'clearChat' });
    });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
