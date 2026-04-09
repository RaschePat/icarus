import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const CLASSIFY_SYSTEM = `강사의 실시간 강의 STT 텍스트를 다음 기준으로 분류하세요.

LESSON: 프로그래밍 개념·코드 설명·라이브러리 언급·과제·실습·예제 관련 기술적 발화
CHAT:   날씨·점심·개인 근황 등 수업과 무관한 사담, 잡담성 질문과 답변
NOISE:  의미 없는 추임새(음·어·그·아), 5단어 미만 단편 발화, 불명확한 텍스트

반드시 JSON만 응답하세요: { "type": "LESSON" | "CHAT" | "NOISE" }`;

const VALID_TYPES = new Set(["LESSON", "CHAT", "NOISE"]);

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ type: "NOISE" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // API 키 미설정 시 단어 수 기준 단순 분류로 폴백
    const words = text.trim().split(/\s+/).length;
    return NextResponse.json({ type: words < 5 ? "NOISE" : "LESSON" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 32,
      system: CLASSIFY_SYSTEM,
      messages: [{ role: "user", content: text }],
    });

    const raw = (res.content[0] as Anthropic.TextBlock).text.trim();
    // JSON 블록 제거 후 파싱
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as { type: string };
    const type = VALID_TYPES.has(parsed.type) ? parsed.type : "NOISE";
    return NextResponse.json({ type });
  } catch {
    return NextResponse.json({ type: "LESSON" }); // 오류 시 안전하게 LESSON으로 폴백
  }
}
