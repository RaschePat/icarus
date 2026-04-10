"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { getNotifications, markNotificationRead } from "@/lib/api";
import type { Notification } from "@/lib/types";

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const userId = (session?.user as { user_id?: string })?.user_id;
  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!userId) return;
    const load = () =>
      getNotifications(userId)
        .then(setNotifications)
        .catch(() => {});
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleRead = async (n: Notification) => {
    if (n.is_read) return;
    await markNotificationRead(n.id).catch(() => {});
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
    );
  };

  const TYPE_STYLE: Record<string, string> = {
    RED_FLAG: "text-red-400",
    INFO:     "text-blue-400",
    QUIZ:     "text-yellow-400",
  };

  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-sm font-semibold">알림</span>
            {unread > 0 && (
              <span className="badge bg-red-900/40 text-red-300 text-xs">{unread}개 미읽음</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">알림이 없습니다.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleRead(n)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${
                  !n.is_read ? "bg-slate-800/20" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-semibold ${TYPE_STYLE[n.type] ?? "text-slate-400"}`}>
                    {n.type}
                  </span>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <p className="text-sm font-medium text-slate-200">{n.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
