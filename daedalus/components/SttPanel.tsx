"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

// ── Web Speech API 최소 타입 선언 (브라우저 전용 API) ─────────────────────

interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: {
      readonly isFinal: boolean;
      [index: number]: { readonly transcript: string };
    };
  };
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

function createRecognition(): ISpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as Record<string, unknown>;
  const Ctor = (W["SpeechRecognition"] ?? W["webkitSpeechRecognition"]) as
    | (new () => ISpeechRecognition)
    | undefined;
  return Ctor ? new Ctor() : null;
}

// ── 로컬 타입 ─────────────────────────────────────────────────────────────

type SegType  = "LESSON" | "CHAT" | "NOISE";
type SegState = SegType | "classifying";

interface Segment {
  id:        string;
  text:      string;
  timestamp: string;
  segType:   SegState;
}

interface Props {
  onApprovedTextChange: (text: string) => void;
}

// ── Claude 분류 API 호출 ──────────────────────────────────────────────────

async function classifySegment(text: string): Promise<SegType> {
  try {
    const res = await fetch("/api/classify-segment", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text }),
    });
    if (!res.ok) return "NOISE";
    const data = (await res.json()) as { type: string };
    return (["LESSON", "CHAT", "NOISE"].includes(data.type)
      ? data.type
      : "NOISE") as SegType;
  } catch {
    return "NOISE";
  }
}

// ── 스타일 맵 ─────────────────────────────────────────────────────────────

const SEG_CARD: Record<SegState, string> = {
  LESSON:      "border-slate-600 bg-slate-800/50",
  CHAT:        "border-yellow-500/40 bg-yellow-950/20",
  NOISE:       "border-slate-700/30 bg-slate-800/20 opacity-40",
  classifying: "border-slate-700 bg-slate-800/30 animate-pulse",
};

const SEG_TEXT: Record<SegState, string> = {
  LESSON:      "text-slate-200",
  CHAT:        "text-yellow-100",
  NOISE:       "text-slate-500",
  classifying: "text-slate-400",
};

const SEG_BADGE: Record<SegState, { label: string; cls: string }> = {
  LESSON:      { label: "📚 수업",   cls: "bg-slate-700 text-slate-200" },
  CHAT:        { label: "💬 사담",   cls: "bg-yellow-900/60 text-yellow-300" },
  NOISE:       { label: "🔇 잡음",   cls: "bg-slate-800 text-slate-500" },
  classifying: { label: "분류 중…", cls: "bg-slate-700 text-slate-400 animate-pulse" },
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

export default function SttPanel({ onApprovedTextChange }: Props) {
  const [segments,    setSegments]    = useState<Segment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interim,     setInterim]     = useState("");
  const [micError,    setMicError]    = useState<string | null>(null);

  const recRef      = useRef<ISpeechRecognition | null>(null);
  const listeningRef = useRef(false); // ref로 onend 클로저 동기화
  const scrollRef   = useRef<HTMLDivElement>(null);

  // 승인(LESSON) 세그먼트 부모에 전달
  useEffect(() => {
    const text = segments
      .filter((s) => s.segType === "LESSON")
      .map((s) => s.text)
      .join(" ");
    onApprovedTextChange(text);
  }, [segments, onApprovedTextChange]);

  // 스크롤 하단 고정
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, interim]);

  // 세그먼트 추가 → 분류 API 호출
  const addSegment = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const id: string = uuidv4();
    const seg: Segment = {
      id,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString("ko-KR"),
      segType: "classifying",
    };
    setSegments((prev) => [...prev, seg]);

    const type = await classifySegment(trimmed);
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, segType: type } : s))
    );
  }, []);

  const deleteSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const clearAll = () => setSegments([]);

  // ── 마이크 시작 ────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const rec = createRecognition();
    if (!rec) {
      setMicError("이 브라우저는 Web Speech API를 지원하지 않습니다. Chrome을 사용하세요.");
      return;
    }

    rec.lang            = "ko-KR";
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: ISpeechRecognitionEvent) => {
      let interimBuf = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result     = e.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          setInterim("");
          addSegment(transcript);
        } else {
          interimBuf += transcript;
        }
      }
      if (interimBuf) setInterim(interimBuf);
    };

    rec.onerror = () => {
      setMicError("마이크 접근 오류. 브라우저 권한을 확인하세요.");
      stopListening();
    };

    rec.onend = () => {
      setInterim("");
      // continuous 모드: 아직 listening 중이면 재시작
      if (listeningRef.current && recRef.current) {
        try { recRef.current.start(); } catch { /* already starting */ }
      }
    };

    listeningRef.current = true;
    recRef.current = rec;
    setIsListening(true);
    setMicError(null);

    try {
      rec.start();
    } catch {
      setMicError("마이크 시작에 실패했습니다.");
      listeningRef.current = false;
      recRef.current = null;
      setIsListening(false);
    }
  }, [addSegment]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 마이크 중지 ────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setIsListening(false);
    setInterim("");
  }, []);

  // 언마운트 시 정리
  useEffect(() => () => { stopListening(); }, [stopListening]);

  // ── 통계 ───────────────────────────────────────────────────────────────

  const lessonCount = segments.filter((s) => s.segType === "LESSON").length;
  const chatCount   = segments.filter((s) => s.segType === "CHAT").length;
  const noiseCount  = segments.filter((s) => s.segType === "NOISE").length;

  // ── 렌더 ───────────────────────────────────────────────────────────────

  return (
    <div className="card flex flex-col gap-3 h-full">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">🎙 STT 실시간 강의</h2>
          {isListening && (
            <span className="flex items-center gap-1 text-xs text-red-400 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              녹음 중
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {isListening ? (
            <button
              className="btn-danger text-xs py-1 px-3 flex items-center gap-1"
              onClick={stopListening}
            >
              ⏹ 중지
            </button>
          ) : (
            <button
              className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
              onClick={startListening}
            >
              🎤 녹음 시작
            </button>
          )}
          <button className="btn-ghost text-xs" onClick={clearAll}>
            초기화
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {micError && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2">
          ⚠ {micError}
        </p>
      )}

      {/* 구간 통계 */}
      {segments.length > 0 && (
        <div className="flex gap-3 text-xs">
          <span className="text-slate-400">
            수업 <span className="text-slate-200 font-semibold">{lessonCount}</span>
          </span>
          <span className="text-yellow-500">
            사담 <span className="font-semibold">{chatCount}</span>
          </span>
          <span className="text-slate-600">
            잡음 <span className="font-semibold">{noiseCount}</span>
          </span>
        </div>
      )}

      {/* 세그먼트 목록 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-1"
        style={{ maxHeight: "340px" }}
      >
        {segments.length === 0 && !interim && (
          <p className="text-slate-500 text-sm text-center mt-8">
            마이크를 켜면 STT 구간이 여기에 표시됩니다.
          </p>
        )}

        {segments.map((seg) => (
          <div
            key={seg.id}
            className={`border rounded-lg p-3 flex gap-2 items-start transition-colors ${SEG_CARD[seg.segType]}`}
          >
            {/* 타임스탬프 */}
            <span className="text-slate-500 text-xs mt-0.5 shrink-0 font-mono w-16">
              {seg.timestamp}
            </span>

            {/* 본문 */}
            <p className={`flex-1 text-sm leading-relaxed ${SEG_TEXT[seg.segType]}`}>
              {seg.text}
            </p>

            {/* 분류 뱃지 */}
            <span className={`badge text-xs shrink-0 ${SEG_BADGE[seg.segType].cls}`}>
              {SEG_BADGE[seg.segType].label}
            </span>

            {/* 삭제 버튼 */}
            {seg.segType !== "classifying" && (
              <button
                className="shrink-0 text-slate-600 hover:text-red-400 transition-colors text-sm leading-none"
                title="삭제"
                onClick={() => deleteSegment(seg.id)}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* 실시간 interim 텍스트 */}
        {interim && (
          <div className="border border-dashed border-slate-600 rounded-lg p-3 flex gap-2 items-start opacity-70">
            <span className="text-slate-500 text-xs mt-0.5 shrink-0 font-mono w-16">live</span>
            <p className="flex-1 text-sm text-slate-400 italic leading-relaxed">{interim}</p>
          </div>
        )}
      </div>

      <p className="text-slate-600 text-xs">
        📚 수업 구간만 지식 카드 생성에 사용됩니다. 사담·잡음은 강사가 삭제할 수 있습니다.
      </p>
    </div>
  );
}
