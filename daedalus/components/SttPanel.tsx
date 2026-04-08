"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { SttSegment } from "@/lib/types";

interface Props {
  /** 승인된 세그먼트 목록이 바뀔 때마다 부모에게 전달 */
  onApprovedTextChange: (text: string) => void;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

const WS_URL = process.env.NEXT_PUBLIC_STT_WS ?? "ws://localhost:8001/stt";

export default function SttPanel({ onApprovedTextChange }: Props) {
  const [segments, setSegments] = useState<SttSegment[]>([]);
  const [connState, setConnState] = useState<ConnectionState>("disconnected");
  const [mockInput, setMockInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 승인된 텍스트 부모에 전달
  useEffect(() => {
    const approved = segments
      .filter((s) => s.status === "approved")
      .map((s) => s.text)
      .join(" ");
    onApprovedTextChange(approved);
  }, [segments, onApprovedTextChange]);

  // 스크롤 하단 고정
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  // WebSocket 연결
  const connect = useCallback(() => {
    if (wsRef.current) return;
    setConnState("connecting");
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnState("connected");
      ws.onerror = () => setConnState("error");
      ws.onclose = () => {
        setConnState("disconnected");
        wsRef.current = null;
      };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data) as { text: string; is_final: boolean };
        addSegment(data.text, data.is_final);
      };
    } catch {
      setConnState("error");
    }
  }, []);

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnState("disconnected");
  };

  const addSegment = (text: string, isFinal: boolean) => {
    setSegments((prev) => [
      ...prev,
      {
        id: uuidv4(),
        text,
        timestamp: new Date().toLocaleTimeString("ko-KR"),
        status: "pending",
        isFinal,
      },
    ]);
  };

  const updateStatus = (id: string, status: SttSegment["status"]) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const approveAll = () => {
    setSegments((prev) => prev.map((s) => ({ ...s, status: "approved" as const })));
  };

  const clearAll = () => setSegments([]);

  // MVP 모의 STT 입력 (WebSocket 미연결 시)
  const submitMock = () => {
    const text = mockInput.trim();
    if (!text) return;
    addSegment(text, true);
    setMockInput("");
  };

  const statusColor: Record<SttSegment["status"], string> = {
    pending:  "border-slate-600 bg-slate-800/50",
    approved: "border-emerald-500/50 bg-emerald-950/30",
    rejected: "border-red-500/30 bg-red-950/20 opacity-50",
  };

  const connBadge: Record<ConnectionState, { label: string; cls: string }> = {
    disconnected: { label: "미연결",    cls: "bg-slate-700 text-slate-300" },
    connecting:   { label: "연결 중…",  cls: "bg-yellow-700/50 text-yellow-300 animate-pulse" },
    connected:    { label: "● 수신 중", cls: "bg-emerald-700/50 text-emerald-300" },
    error:        { label: "오류",       cls: "bg-red-700/50 text-red-300" },
  };

  return (
    <div className="card flex flex-col gap-3 h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">🎙 STT 실시간 강의 텍스트</h2>
          <span className={`badge ${connBadge[connState].cls}`}>
            {connBadge[connState].label}
          </span>
        </div>
        <div className="flex gap-2">
          {connState === "disconnected" || connState === "error" ? (
            <button className="btn-primary text-xs py-1 px-3" onClick={connect}>
              연결
            </button>
          ) : (
            <button className="btn-ghost text-xs" onClick={disconnect}>
              연결 해제
            </button>
          )}
          <button className="btn-success text-xs" onClick={approveAll}>
            전체 승인
          </button>
          <button className="btn-danger text-xs" onClick={clearAll}>
            초기화
          </button>
        </div>
      </div>

      {/* 세그먼트 목록 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-1"
        style={{ maxHeight: "340px" }}
      >
        {segments.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">
            STT 세그먼트가 여기에 표시됩니다.
          </p>
        )}
        {segments.map((seg) => (
          <div
            key={seg.id}
            className={`border rounded-lg p-3 flex gap-3 items-start transition-colors ${statusColor[seg.status]}`}
          >
            <span className="text-slate-500 text-xs mt-0.5 shrink-0 font-mono">
              {seg.timestamp}
            </span>
            <p className="flex-1 text-sm leading-relaxed">{seg.text}</p>
            {seg.status === "pending" && (
              <div className="flex gap-1 shrink-0">
                <button
                  className="btn-success py-0.5 px-2 text-xs"
                  onClick={() => updateStatus(seg.id, "approved")}
                >
                  승인
                </button>
                <button
                  className="btn-danger py-0.5 px-2 text-xs"
                  onClick={() => updateStatus(seg.id, "rejected")}
                >
                  거절
                </button>
              </div>
            )}
            {seg.status === "approved" && (
              <span className="badge bg-emerald-800/50 text-emerald-300 text-xs shrink-0">✓ 승인</span>
            )}
            {seg.status === "rejected" && (
              <span className="badge bg-red-800/30 text-red-400 text-xs shrink-0">✕ 거절</span>
            )}
          </div>
        ))}
      </div>

      {/* MVP 모의 입력 (WebSocket 미연결 시 수동 입력) */}
      {connState !== "connected" && (
        <div className="border-t border-slate-700 pt-3">
          <label className="label">모의 STT 입력 (데모용)</label>
          <div className="flex gap-2">
            <input
              className="input text-sm"
              placeholder="강의 텍스트를 직접 입력하세요…"
              value={mockInput}
              onChange={(e) => setMockInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitMock()}
            />
            <button className="btn-primary text-sm px-4 shrink-0" onClick={submitMock}>
              추가
            </button>
          </div>
        </div>
      )}

      <p className="text-slate-600 text-xs">
        승인된 세그먼트만 지식 카드 생성에 사용됩니다. (MyDay 명세 준수)
      </p>
    </div>
  );
}
