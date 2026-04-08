import * as vscode from "vscode";
import { WingPanelProvider } from "./wingPanel";
import { McpClient } from "./mcpClient";
import { ClaudeClient } from "./claudeClient";
import { HintEngine } from "./hintEngine";
import { ActivityTracker } from "./activityTracker";

export async function activate(context: vscode.ExtensionContext) {
  // ── 의존성 초기화 ──────────────────────────────────────────────
  const mcp     = new McpClient();
  const hint    = new HintEngine();
  const claude  = new ClaudeClient(mcp);
  const panel   = new WingPanelProvider(context.extensionUri, claude, mcp, hint);
  const tracker = new ActivityTracker(mcp, hint, "user-default");

  // MCP 서버 연결 (실패해도 Extension은 동작)
  mcp.connect().catch((e) =>
    vscode.window.showWarningMessage(`Wing MCP 연결 실패: ${e.message}`)
  );

  tracker.start();

  // ── 사이드바 WebView 등록 ───────────────────────────────────────
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WingPanelProvider.VIEW_ID, panel, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // ── 비행테스트 Command ──────────────────────────────────────────
  // 메모: VS Code 기본 Run 버튼을 가로채지 않으며, Wing 전용 커맨드만 사용합니다.
  context.subscriptions.push(
    vscode.commands.registerCommand("wing.flightTest", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("Wing: 열린 파일이 없습니다.");
        return;
      }

      const filePath = vscode.workspace.asRelativePath(editor.document.uri);
      const ext = filePath.split(".").pop();

      // 확장자별 기본 명령어 추론
      const defaultCmd: Record<string, string> = {
        java: `javac ${filePath}`,
        py:   `python ${filePath}`,
        js:   `node ${filePath}`,
      };
      const command = defaultCmd[ext ?? ""] ?? "";

      if (!command) {
        vscode.window.showWarningMessage(
          `Wing: 지원하지 않는 파일 형식입니다 (.${ext}). java / py / js만 가능합니다.`
        );
        return;
      }

      await panel.runFlightTest(filePath, command);
    })
  );

  // ── 대화 초기화 Command ─────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("wing.clearChat", () => {
      hint.reset();
    })
  );

  // ── 정리 ───────────────────────────────────────────────────────
  context.subscriptions.push(
    new vscode.Disposable(() => {
      tracker.dispose();
      mcp.dispose();
    })
  );
}

export function deactivate() {}
