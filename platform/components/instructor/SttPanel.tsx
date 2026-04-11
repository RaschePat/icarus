"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { classifySegment } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";

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

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  onAnalysisComplete: (result: AnalysisResult) => void;
  lessonTopic?:       string;
  lessonKeywords?:    string[];
  lessonLibraries?:   string[];
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

export default function SttPanel({ onAnalysisComplete, lessonTopic, lessonKeywords, lessonLibraries }: Props) {
  const [sentences,   setSentences]   = useState<string[]>([]);
  const [interim,     setInterim]     = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [micError,    setMicError]    = useState<string | null>(null);
  const [lastResult,  setLastResult]  = useState<AnalysisResult | null>(null);

  const recRef      = useRef<ISpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const scrollRef   = useRef<HTMLDivElement>(null);

  // 스크롤 하단 고정
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sentences, interim]);

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
          const trimmed = transcript.trim();
          if (trimmed) setSentences((prev) => [...prev, trimmed]);
          setInterim("");
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── 수업 분석 ──────────────────────────────────────────────────────────

  const analyzeLesson = useCallback(async () => {
    const transcript = sentences.join(" ").trim();
    if (!transcript) return;

    // 녹음 중이면 먼저 중지
    if (isListening) stopListening();

    setIsAnalyzing(true);
    setLastResult(null);

    try {
      const data = await classifySegment({
        transcript,
        topic:     lessonTopic     || undefined,
        keywords:  lessonKeywords?.length  ? lessonKeywords  : undefined,
        libraries: lessonLibraries?.length ? lessonLibraries : undefined,
      });
      setLastResult(data);
      onAnalysisComplete(data);
    } catch {
      setMicError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [sentences, isListening, stopListening, onAnalysisComplete, lessonTopic, lessonKeywords, lessonLibraries]);

  // 녹음 중지 시 자동 분석
  useEffect(() => {
    if (!isListening && sentences.length > 0 && !isAnalyzing) {
      analyzeLesson();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // ── 초기화 ─────────────────────────────────────────────────────────────

  const clearAll = () => {
    if (!confirm("정말 초기화할까요?")) return;
    if (isListening) stopListening();
    setSentences([]);
    setInterim("");
    setLastResult(null);
    setMicError(null);
  };

  const fullTranscript = sentences.join(" ");
  const charCount      = fullTranscript.length;

  // ── 렌더 ───────────────────────────────────────────────────────────────

  return (
    <div className="card flex flex-col gap-3">

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

        <div className="flex gap-2 items-center flex-wrap">
          {isListening ? (
            <button
              className="btn-danger text-xs py-1 px-3"
              onClick={stopListening}
            >
              ⏹ 중지
            </button>
          ) : (
            <button
              className="btn-primary text-xs py-1 px-3"
              onClick={startListening}
              disabled={isAnalyzing}
            >
              🎤 녹음 시작
            </button>
          )}

          <button
            className="btn-ghost text-xs py-1 px-3 disabled:opacity-30"
            onClick={analyzeLesson}
            disabled={sentences.length === 0 || isAnalyzing}
            title="전체 강의 텍스트를 Claude로 분석하여 지식 카드를 자동 생성합니다"
          >
            {isAnalyzing ? (
              <span className="animate-pulse">⏳ 분석 중…</span>
            ) : (
              "🔍 수업 분석"
            )}
          </button>

          <button
            className="btn-ghost text-xs"
            onClick={clearAll}
            disabled={isAnalyzing}
          >
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

      {/* 누적 텍스트 뷰어 */}
      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-lg bg-slate-900/60 border border-slate-700 p-3 text-sm leading-relaxed"
        style={{ minHeight: "160px", maxHeight: "300px" }}
      >
        {sentences.length === 0 && !interim ? (
          <p className="text-slate-500 text-center mt-6">
            마이크를 켜면 STT 텍스트가 여기에 누적됩니다.
          </p>
        ) : (
          <>
            <span className="text-slate-300">{fullTranscript}</span>
            {/* 실시간 interim */}
            {interim && (
              <span className="text-slate-500 italic"> {interim}</span>
            )}
          </>
        )}
      </div>

      {/* 통계 바 */}
      {sentences.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>문장 <span className="text-slate-300 font-semibold">{sentences.length}</span>개</span>
          <span>·</span>
          <span>글자 <span className="text-slate-300 font-semibold">{charCount.toLocaleString()}</span>자</span>
          {!isListening && sentences.length > 0 && (
            <>
              <span>·</span>
              <span className="text-blue-400">수업이 끝났으면 '수업 분석'을 눌러주세요</span>
            </>
          )}
        </div>
      )}

      {/* 분석 결과 미리보기 */}
      {lastResult && (
        <div className="border border-emerald-700/50 bg-emerald-950/20 rounded-lg p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-emerald-400">✅ 분석 완료 — 지식 카드에 자동 반영됨</p>
          <p className="text-xs text-slate-300">
            <span className="text-slate-500">주제: </span>{lastResult.topic}
          </p>
          <div className="flex flex-wrap gap-1">
            {lastResult.keywords.map((kw) => (
              <span key={kw} className="badge bg-slate-700 text-slate-300 text-xs">{kw}</span>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            핵심 개념 {lastResult.core_concepts.length}개 추출됨
          </p>
        </div>
      )}

      <p className="text-slate-600 text-xs">
        수업 종료 후 '수업 분석'을 누르면 Claude가 사담·잡음을 제거하고 지식 카드를 자동 생성합니다.
      </p>
    </div>
  );
}
