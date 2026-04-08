import * as vscode from "vscode";
import { ClaudeClient } from "./claudeClient";
import { McpClient } from "./mcpClient";
import { HintEngine } from "./hintEngine";

export type Message = { role: "user" | "wing" | "system"; text: string };

export class WingPanelProvider implements vscode.WebviewViewProvider {
  public static readonly VIEW_ID = "wing.chatPanel";

  private _view?: vscode.WebviewView;
  private _messages: Message[] = [];

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
      }
    });
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

    // 요청 카테고리 분류 및 WING_REQUEST 로그는 ClaudeClient 내부에서 처리
    const reply = await this._claude.chat(text, this._messages);
    this._addMessage({ role: "wing", text: reply });

    // 힌트 단계 체크
    const hint = this._hint.getHintIfReady();
    if (hint) {
      this._addMessage({ role: "system", text: `[Wing 힌트 ${hint.level}단계] ${hint.message}` });
    }
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

    // Extension → WebView 메시지
    window.addEventListener('message', ({ data }) => {
      if (data.type === 'messages') renderMessages(data.data);
    });

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
