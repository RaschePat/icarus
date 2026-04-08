import type { LessonContext } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/v1";

export async function syncLesson(lesson: LessonContext): Promise<{ status: string; lesson_id: string }> {
  const res = await fetch(`${BASE}/lesson/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lesson),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`배포 실패 (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getLesson(lessonId: string): Promise<LessonContext> {
  const res = await fetch(`${BASE}/lesson/${lessonId}`);
  if (!res.ok) throw new Error(`수업 조회 실패 (${res.status})`);
  return res.json();
}
