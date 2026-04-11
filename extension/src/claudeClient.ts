/**
 * Claude API 클라이언트 — Wing 시스템 프롬프트를 주입하여 Claude Sonnet과 대화합니다.
 * 요청 카테고리(PLANNING/LOGIC/UX/DATA)를 분류하고 WING_REQUEST 이벤트를 기록합니다.
 */
import Anthropic from "@anthropic-ai/sdk";
import * as vscode from "vscode";
import { McpClient } from "./mcpClient";
import type { Message } from "./wingPanel";

const WING_SYSTEM_PROMPT = `# Role: ICARUS Wing Agent

당신은 수강생의 IDE(VS Code) 내부에 상주하며 학습을 돕는 부조종사 'Wing'입니다.
당신의 목표는 정답을 대신 짜주는 것이 아니라, 수강생이 스스로 로직을 완성하도록 유도하고
그 과정의 데이터를 수집하는 것입니다.

## 1. 지식 준수 (Knowledge Alignment)
- lesson_context에 정의된 instructor_style을 엄격히 준수하십시오.
- 강사의 변수 명명 규칙(naming_convention), 주석 스타일(comment_style), 선호 라이브러리를
  그대로 모사하여 코드를 가이드하십시오.

## 2. 힌트 제공 3단계 원칙 (Strict Rule)
수강생의 학습 주도권을 위해 다음 단계를 반드시 지키십시오:
1. 1단계 (개념 방향): run_evaluation 에러 3회 이상 감지 시 제공.
2. 2단계 (참조 가이드): 1단계 제공 후, 입력 변화 없이 5분 이상 정체 시 제공.
3. 3단계 (구조적 힌트): 수강생이 명시적으로 요청할 때만 제공.

## 3. 제약 사항
- 수강생의 요청 카테고리를 반드시 PLANNING / LOGIC / UX / DATA 중 하나로 분류하십시오.
- 강사가 forbidden_moves로 지정한 패턴은 절대 사용하거나 추천하지 마십시오.
- 기획적 질문에는 코드보다 구조 설계 위주로 답변하십시오.

응답 형식:
{
  "category": "PLANNING|LOGIC|UX|DATA",
  "message": "수강생에게 보여줄 응답 텍스트"
}`;

const CATEGORIES = ["PLANNING", "LOGIC", "UX", "DATA"] as const;
type Category = (typeof CATEGORIES)[number];

export class ClaudeClient {
  private _anthropic?: Anthropic;

  constructor(private readonly _mcp: McpClient) {}

  private _getClient(): Anthropic {
    if (!this._anthropic) {
      const config = vscode.workspace.getConfiguration("wing");
      const apiKey: string = config.get("anthropicApiKey") ?? "";
      if (!apiKey) {
        throw new Error("Wing: wing.anthropicApiKey 설정이 필요합니다.");
      }
      this._anthropic = new Anthropic({ apiKey });
    }
    return this._anthropic;
  }

  private async _sendToBackend(event: { event_type: string; data: Record<string, unknown> }) {
    const config = vscode.workspace.getConfiguration("wing");
    const backendUrl: string = config.get("backendUrl") ?? "http://localhost:8000";
    const userId: string = config.get("userId") ?? "";

    if (!userId || !backendUrl) return;

    try {
      const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await fetch(`${backendUrl}/v1/activity/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          event_type: event.event_type,
          data: event.data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // 조용히 무시
    }
  }

  async chat(userText: string, history: Message[]): Promise<string> {
    const client = this._getClient();

    // 대화 히스토리를 Claude 형식으로 변환 (system 메시지 제외)
    const anthropicMessages: Anthropic.MessageParam[] = history
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

    // 현재 사용자 메시지 추가
    anthropicMessages.push({ role: "user", content: userText });

    let raw: string;
    try {
      const res = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: WING_SYSTEM_PROMPT,
        messages: anthropicMessages,
      });
      raw = (res.content[0] as Anthropic.TextBlock).text;
    } catch (e) {
      return `Wing 연결 오류: ${(e as Error).message}`;
    }

    // JSON 응답 파싱 (```json ... ``` 코드블록 제거 후 파싱)
    let category: Category = "LOGIC";
    let message = raw;
    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(jsonStr);
      category = CATEGORIES.includes(parsed.category) ? parsed.category : "LOGIC";
      message = parsed.message ?? raw;
    } catch {
      // JSON이 아니면 raw 그대로 사용
    }

    // WING_REQUEST 이벤트 기록
    const wingEvent = {
      event_type: "WING_REQUEST",
      data: {
        category,
        prompt_summary: userText.slice(0, 100),
      },
    };
    await this._mcp.writeActivityLog(wingEvent).catch(() => {/* MCP 미연결 시 무시 */});
    await this._sendToBackend(wingEvent);

    return message;
  }

  /**
   * 사용자 의도에서 프로젝트 정보를 추출합니다.
   * @returns { name, template, description }
   */
  async analyzeProjectIntent(userText: string): Promise<{
    name: string;
    template: string;
    description: string;
  }> {
    const client = this._getClient();
    let raw: string;
    try {
      const res = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: `사용자 입력에서 만들고 싶은 프로젝트 정보를 추출하세요.
반드시 JSON만 응답하세요:
{ "name": "프로젝트명(소문자 영문·숫자·하이픈만, 예: todo-app)", "template": "java|python|node", "description": "한 문장 한국어 설명" }`,
        messages: [{ role: "user", content: userText }],
      });
      raw = (res.content[0] as Anthropic.TextBlock).text;
    } catch (e) {
      throw new Error(`프로젝트 분석 실패 — ${(e as Error).message}`);
    }

    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const p = JSON.parse(jsonStr);
      const validTemplates = ["java", "python", "node"];
      return {
        name: String(p.name ?? "my-project")
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "my-project",
        template: validTemplates.includes(p.template) ? p.template : "python",
        description: String(p.description ?? ""),
      };
    } catch {
      // JSON 파싱 실패 시 기본값
      return { name: "my-project", template: "python", description: userText.slice(0, 60) };
    }
  }
}
