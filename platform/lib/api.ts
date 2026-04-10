const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/v1";

// ── 공통 fetch 헬퍼 ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API 오류 (${res.status}): ${text}`);
  }
  return res.json();
}

/** JWT 인증 헤더 포함 fetch */
async function apiFetchAuth<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      ...options?.headers,
    },
  });
}

// ── 인증 ─────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: string;
  name: string;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(
  email: string,
  password: string,
  name: string,
  role: string,
): Promise<LoginResponse> {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, role }),
  });
}

// ── 레슨 ─────────────────────────────────────────────────────────────────

import type { LessonContext } from "./types";

export async function syncLesson(lesson: LessonContext) {
  return apiFetch<{ status: string; lesson_id: string }>("/lesson/sync", {
    method: "POST",
    body: JSON.stringify(lesson),
  });
}

export async function getLesson(lessonId: string): Promise<LessonContext> {
  return apiFetch(`/lesson/${lessonId}`);
}

export async function getTodayLesson(): Promise<{ lesson_id: string | null }> {
  return apiFetch("/today-lesson");
}

export async function activateQuiz(lessonId: string) {
  return apiFetch(`/lesson/${lessonId}/quiz-active`, { method: "PATCH" });
}

// ── 과정 / 단원 ───────────────────────────────────────────────────────────

import type { Course, Unit, UserBasic, MentorStudentItem, MentorStudentDetail } from "./types";

export async function getCourses(): Promise<Course[]> {
  return apiFetch("/courses");
}

/** 강사 본인이 배정된 과정 목록 (JWT 필수) */
export async function getMyCourses(token: string): Promise<Course[]> {
  return apiFetchAuth("/courses/my", token);
}

export async function createCourse(data: { title: string; description: string; duration_months: number }) {
  return apiFetch<Course>("/courses", { method: "POST", body: JSON.stringify(data) });
}

export async function assignInstructor(courseId: number, instructorId: string, token: string) {
  return apiFetchAuth(`/courses/${courseId}/assign-instructor`, token, {
    method: "POST",
    body: JSON.stringify({ instructor_id: instructorId }),
  });
}

export async function removeInstructor(courseId: number, instructorId: string, token: string) {
  return apiFetchAuth(`/courses/${courseId}/instructors/${instructorId}`, token, {
    method: "DELETE",
  });
}

export async function getUnits(courseId: number): Promise<Unit[]> {
  return apiFetch(`/courses/${courseId}/units`);
}

export async function createUnit(courseId: number, data: { title: string; order_index: number }) {
  return apiFetch<Unit>(`/courses/${courseId}/units`, { method: "POST", body: JSON.stringify(data) });
}

import type { Section } from "./types";

export async function getSections(courseId: number, unitId: number): Promise<Section[]> {
  return apiFetch(`/courses/${courseId}/units/${unitId}/sections`);
}

export async function enrollStudent(lessonId: string, studentId: string): Promise<void> {
  await apiFetch(`/lessons/${lessonId}/enroll`, {
    method: "POST",
    body: JSON.stringify({ student_id: studentId }),
  });
}

// ── 마이크로 프로젝트 ─────────────────────────────────────────────────────

import type { MicroProject } from "./types";

export async function getMicroProjects(userId: string): Promise<MicroProject[]> {
  return apiFetch(`/micro-projects/${userId}`);
}

export async function createMicroProject(data: {
  user_id: string;
  session_id: string;
  name: string;
  template: string;
  interest_category?: string;
  harness_total?: number;
}) {
  return apiFetch<MicroProject>("/micro-projects", { method: "POST", body: JSON.stringify(data) });
}

// ── 알림 ─────────────────────────────────────────────────────────────────

import type { Notification } from "./types";

export async function getNotifications(userId: string): Promise<Notification[]> {
  return apiFetch(`/notifications/${userId}`);
}

export async function markNotificationRead(id: number) {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

// ── 사용자 프로필 ─────────────────────────────────────────────────────────

import type { UserProfile } from "./types";

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return apiFetch(`/user/profile/${userId}`);
}

// ── 역할별 유저 목록 (운영자 전용) ───────────────────────────────────────

export async function getUsersByRole(role: string, token: string, search?: string): Promise<UserBasic[]> {
  const qs = search ? `&search=${encodeURIComponent(search)}` : "";
  return apiFetchAuth(`/users?role=${role}${qs}`, token);
}

// ── 멘토 ─────────────────────────────────────────────────────────────────

export async function getMentorStudents(mentorId: string): Promise<MentorStudentItem[]> {
  return apiFetch<MentorStudentItem[]>(`/mentor/students?mentor_id=${mentorId}`);
}

export async function getMentorStudentDetail(studentId: string): Promise<MentorStudentDetail> {
  return apiFetch(`/mentor/students/${studentId}/detail`);
}

export async function addMentorStudent(mentorId: string, studentId: string) {
  return apiFetch("/mentor/students", {
    method: "POST",
    body: JSON.stringify({ mentor_id: mentorId, student_id: studentId }),
  });
}

export async function removeMentorStudent(mentorId: string, studentId: string) {
  return apiFetch(`/mentor/students/${studentId}?mentor_id=${mentorId}`, { method: "DELETE" });
}

// ── STT 분석 ─────────────────────────────────────────────────────────────

import type { AnalysisResult } from "./types";

export async function classifySegment(data: {
  transcript: string;
  topic?: string;
  keywords?: string[];
  libraries?: string[];
}): Promise<AnalysisResult> {
  const res = await fetch("/api/classify-segment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("STT 분석 실패");
  return res.json();
}
