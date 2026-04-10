import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ── 분석 결과 타입 ────────────────────────────────────────────────────────

export interface AnalysisResult {
  topic: string;
  keywords: string[];
  core_concepts: { title: string; summary: string }[];
}

// ── 시스템 프롬프트 빌더 ──────────────────────────────────────────────────

function buildSystem(topic?: string, keywords?: string[]): string {
  const contextLines: string[] = [];
  if (topic?.trim()) {
    contextLines.push(`오늘 수업 주제: ${topic.trim()}`);
  }
  if (keywords && keywords.length > 0) {
    contextLines.push(`핵심 키워드: ${keywords.join(", ")}`);
  }
  const contextBlock =
    contextLines.length > 0
      ? `\n\n[수업 맥락]\n${contextLines.join("\n")}\n위 맥락을 기준으로 수업과 무관한 사담·잡음을 판별하세요.`
      : "";

  return `당신은 IT 부트캠프 강의 STT 텍스트 분석 엔진입니다.
강사의 실시간 발화 전체(사담·잡음 포함)를 받아 핵심 수업 내용만 추출합니다.${contextBlock}

분류 기준:
- LESSON: 프로그래밍 개념·코드 설명·라이브러리 언급·과제·실습·예제 관련 기술적 발화
- CHAT/NOISE (제거 대상): 날씨·점심·개인 근황 등 수업 무관 사담, 의미 없는 추임새, 5단어 미만 단편 발화

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "topic": "오늘 수업의 핵심 주제 (1줄, 예: Java Collections Framework)",
  "keywords": ["핵심 키워드1", "키워드2", ...],
  "core_concepts": [
    { "title": "개념 이름", "summary": "2~3문장 설명" },
    ...
  ]
}

- keywords: 수업에서 언급된 핵심 기술 용어 목록 (5~15개)
- core_concepts: 오늘 수업의 핵심 개념 카드 (3~7개)
- 사담·잡음은 topic/keywords/core_concepts 어디에도 포함하지 마세요`;
}

// ── 폴백 분류기 (API 키 없을 때) ─────────────────────────────────────────

function buildFallback(transcript: string): AnalysisResult {
  const sentences = transcript.split(/[.!?。]\s*/).filter((s) => s.trim().length > 10);
  const words = transcript.split(/\s+/).filter((w) => w.length >= 3);
  const freqMap: Record<string, number> = {};
  for (const w of words) freqMap[w] = (freqMap[w] ?? 0) + 1;
  const keywords = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
  return {
    topic: sentences[0]?.slice(0, 40) ?? "수업 내용",
    keywords,
    core_concepts:
      sentences.slice(0, 3).map((s, i) => ({
        title: `개념 ${i + 1}`,
        summary: s.trim(),
      })),
  };
}

// ── POST /api/classify-segment ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { transcript, topic, keywords } = (await req.json()) as {
    transcript?: string;
    topic?:      string;
    keywords?:   string[];
  };

  if (!transcript?.trim()) {
    return NextResponse.json<AnalysisResult>({
      topic: "",
      keywords: [],
      core_concepts: [],
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<AnalysisResult>(buildFallback(transcript));
  }

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:     buildSystem(topic, keywords),
      messages:   [{ role: "user", content: transcript }],
    });

    const raw     = (res.content[0] as Anthropic.TextBlock).text.trim();
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(jsonStr) as AnalysisResult;

    // 최소 검증
    if (!parsed.topic || !Array.isArray(parsed.keywords) || !Array.isArray(parsed.core_concepts)) {
      return NextResponse.json<AnalysisResult>(buildFallback(transcript));
    }

    return NextResponse.json<AnalysisResult>(parsed);
  } catch {
    return NextResponse.json<AnalysisResult>(buildFallback(transcript));
  }
}
