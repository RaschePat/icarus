import * as vscode from "vscode";
import { WingPanelProvider, HarnessConfig } from "./wingPanel";
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

  // ── 레슨 퀴즈 로드 Command ──────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("wing.loadLesson", async () => {
      const config   = vscode.workspace.getConfiguration("wing");
      const lessonId: string = config.get("lessonId") ?? "";
      if (!lessonId) {
        vscode.window.showWarningMessage("Wing: wing.lessonId 설정이 필요합니다.");
        return;
      }
      try {
        const lesson = await fetchLesson(lessonId);
        const pool = lesson.quiz_pool ?? [];
        if (pool.length > 0) { panel.loadQuiz(pool); }
        if (lesson.harness_config) { panel.setHarnessConfig(lesson.harness_config); }
        vscode.window.showInformationMessage(`Wing: 레슨 로드 완료 (퀴즈 ${pool.length}문항).`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Wing: 레슨 로드 실패 — ${msg}`);
      }
    })
  );

  // 활성화 시 자동 레슨 로드 (퀴즈 + harness_config)
  const lessonId: string = vscode.workspace.getConfiguration("wing").get("lessonId") ?? "";
  if (lessonId) {
    fetchLesson(lessonId)
      .then((lesson) => {
        if (lesson.quiz_pool && lesson.quiz_pool.length > 0) { panel.loadQuiz(lesson.quiz_pool); }
        if (lesson.harness_config) { panel.setHarnessConfig(lesson.harness_config); }
      })
      .catch(() => { /* 무시 — 수동 로드로 재시도 가능 */ });
  }

  // ── 정리 ───────────────────────────────────────────────────────
  context.subscriptions.push(
    new vscode.Disposable(() => {
      tracker.dispose();
      mcp.dispose();
    })
  );
}

/** /v1/lesson/{lessonId} 전체를 가져옵니다 */
async function fetchLesson(lessonId: string): Promise<{
  quiz_pool?: Array<{ id: string; question: string; options: string[]; answer_index: number }>;
  harness_config?: HarnessConfig;
}> {
  const config  = vscode.workspace.getConfiguration("wing");
  const baseUrl: string = config.get("backendUrl") ?? "http://localhost:8000";
  const url = `${baseUrl}/v1/lesson/${encodeURIComponent(lessonId)}`;

  const res = await fetch(url);
  if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
  return res.json() as Promise<{ quiz_pool?: Array<{ id: string; question: string; options: string[]; answer_index: number }>; harness_config?: HarnessConfig; }>;
}

export function deactivate() {}
