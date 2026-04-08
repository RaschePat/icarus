/**
 * ActivityTracker — VS Code 이벤트를 감지하여 MCP write_activity_log로 기록합니다.
 * 감지 이벤트: INPUT_TYPE (타이핑/붙여넣기), FOCUS_CHANGE (창 포커스 전환)
 */
import * as vscode from "vscode";
import { McpClient } from "./mcpClient";
import { HintEngine } from "./hintEngine";

export class ActivityTracker {
  private _disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _mcp: McpClient,
    private readonly _hint: HintEngine,
    private readonly _userId: string
  ) {}

  start() {
    // 텍스트 변경 → INPUT_TYPE 이벤트
    this._disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.contentChanges.length === 0) return;

        const isPaste = e.contentChanges.some((c) => c.text.includes("\n") || c.text.length > 5);
        const ext = e.document.fileName.split(".").pop() ?? "";

        this._hint.recordInput();

        this._log({
          event_type: "INPUT_TYPE",
          data: { is_paste: isPaste, file_extension: ext },
        });
      })
    );

    // 창 포커스 변경 → FOCUS_CHANGE 이벤트
    this._disposables.push(
      vscode.window.onDidChangeWindowState((state) => {
        const focusState = state.focused ? "FOCUS_IN" : "FOCUS_OUT";
        const trigger   = state.focused ? "WINDOW_FOCUS" : "WINDOW_BLUR";
        this._log({
          event_type: "FOCUS_CHANGE",
          data: { state: focusState, trigger },
        });
      })
    );
  }

  private _log(event: { event_type: string; data: Record<string, unknown> }) {
    const payload = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    // 비동기 fire-and-forget — MCP 미연결 시 조용히 무시
    this._mcp.writeActivityLog(payload).catch(() => {});
  }

  dispose() {
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
  }
}
