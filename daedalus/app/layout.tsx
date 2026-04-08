import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daedalus Console — ICARUS",
  description: "강사용 지식 배포 콘솔",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950">
        {/* 상단 네비게이션 바 */}
        <header className="h-14 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-blue-400">✦</span> Daedalus
          </span>
          <span className="text-slate-600 text-sm">|</span>
          <span className="text-slate-400 text-sm">강사용 지식 배포 콘솔</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
