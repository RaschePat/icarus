"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import NotificationBell from "./NotificationBell";

interface Props {
  role: string;
}

const NAV_ITEMS: Record<string, { label: string; href: string }[]> = {
  student: [
    { label: "내 학습",    href: "/student" },
    { label: "프로젝트",   href: "/student/projects" },
    { label: "적성 분석",  href: "/student/aptitude" },
  ],
  instructor: [
    { label: "강의 콘솔",  href: "/instructor" },
  ],
  admin: [
    { label: "전체 현황",  href: "/admin" },
    { label: "과정 관리",  href: "/admin/courses" },
  ],
  mentor: [
    { label: "내 학생",    href: "/mentor" },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  student:    "수강생",
  instructor: "강사",
  admin:      "운영자",
  mentor:     "멘토",
};

export default function Navbar({ role }: Props) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] ?? [];

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700/60">
      <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-6">
        {/* 로고 */}
        <Link href="/" className="font-bold text-base text-slate-100 shrink-0">
          ICARUS
        </Link>

        {/* 역할 배지 */}
        <span className="badge bg-blue-900/40 text-blue-300 text-xs shrink-0">
          {ROLE_LABEL[role] ?? role}
        </span>

        {/* 메뉴 */}
        <div className="flex gap-1 flex-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* 우측: 알림 + 로그아웃 */}
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
}
