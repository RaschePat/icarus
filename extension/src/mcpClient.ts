/**
 * MCP 클라이언트 — Python MCP 서버(server.py)를 자식 프로세스로 실행하고
 * stdio JSON-RPC로 도구를 호출합니다.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as vscode from "vscode";

export interface EvalResult {
  exit_code: number;
  stdout: string;
  stderr: string;
}

export class McpClient {
  private _client?: Client;
  private _connected = false;

  async connect(): Promise<void> {
    const config = vscode.workspace.getConfiguration("wing");
    const serverPath: string = config.get("mcpServerPath") ?? "";
    const projectRoot: string = config.get("projectRoot") ?? "";

    if (!serverPath) {
      vscode.window.showWarningMessage("Wing: wing.mcpServerPath 설정이 필요합니다.");
      return;
    }

    const transport = new StdioClientTransport({
      command: "python",
      args: [serverPath],
      env: { ...process.env, ICARUS_PROJECT_ROOT: projectRoot },
    });

    this._client = new Client({ name: "icarus-wing-extension", version: "0.1.0" });
    await this._client.connect(transport);
    this._connected = true;
  }

  private async _call<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
    if (!this._connected || !this._client) {
      throw new Error("MCP 서버에 연결되지 않았습니다.");
    }
    const res = await this._client.callTool({ name: toolName, arguments: args });
    const text = (res.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    return JSON.parse(text) as T;
  }

  async setupProject(path: string, template: string) {
    return this._call("setup_project", { path, template });
  }

  async injectHarness(
    filePath: string,
    logicId: string,
    searchPattern: string,
    matchStrategy = "first_occurrence"
  ) {
    return this._call("inject_harness", {
      file_path: filePath,
      logic_id: logicId,
      search_pattern: searchPattern,
      match_strategy: matchStrategy,
    });
  }

  async runEvaluation(filePath: string, command: string): Promise<EvalResult> {
    return this._call<EvalResult>("run_evaluation", { file_path: filePath, command });
  }

  async writeActivityLog(eventJson: Record<string, unknown>) {
    return this._call("write_activity_log", { event_json: eventJson });
  }

  async checkIdleTime(): Promise<{ idle_seconds: number | null; message?: string }> {
    return this._call("check_idle_time", {});
  }

  dispose() {
    this._client?.close();
    this._connected = false;
  }
}
