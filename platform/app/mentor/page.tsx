"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getMentorStudents, addMentorStudent, removeMentorStudent } from "@/lib/api";
import Link from "next/link";

interface Student {
  user_id: string;
  name: string;
  email: string;
}

export default function MentorPage() {
  const { data: session } = useSession();
  const mentorId = (session?.user as { user_id?: string })?.user_id ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    if (!mentorId) return;
    getMentorStudents(mentorId)
      .then((data) => setStudents(data as Student[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [mentorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    const id = addInput.trim();
    if (!id) return;
    setAdding(true);
    setError("");
    try {
      await addMentorStudent(mentorId, id);
      setAddInput("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (studentId: string) => {
    if (!confirm("이 학생을 제거하시겠습니까?")) return;
    await removeMentorStudent(mentorId, studentId).catch(() => {});
    load();
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">내 학생 목록</h1>
        <p className="text-slate-400 text-sm mt-0.5">담당 학생의 상세 분석을 확인하세요.</p>
      </div>

      {/* 학생 추가 */}
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold text-sm">학생 추가</h2>
        <div className="flex gap-2">
          <input
            className="input text-sm flex-1"
            placeholder="학생 user_id 입력"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            className="btn-primary text-sm px-4 shrink-0"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? "추가 중…" : "추가"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* 학생 목록 */}
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold text-sm">담당 학생 ({students.length}명)</h2>
        {loading && <p className="text-slate-500 text-sm animate-pulse">불러오는 중…</p>}
        {!loading && students.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-6">담당 학생이 없습니다.</p>
        )}
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <div
              key={s.user_id}
              className="flex items-center justify-between bg-slate-800/40 rounded-lg px-4 py-3"
            >
              <div>
                <p className="font-semibold text-sm">{s.name}</p>
                <p className="text-xs text-slate-400">{s.email}</p>
                <p className="text-xs text-slate-600 font-mono">{s.user_id}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/mentor/student/${s.user_id}`}
                  className="btn-ghost text-xs"
                >
                  상세 보기
                </Link>
                <button
                  onClick={() => handleRemove(s.user_id)}
                  className="btn-danger text-xs"
                >
                  제거
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
