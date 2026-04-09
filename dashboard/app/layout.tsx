import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insight Dashboard — ICARUS",
  description: "멘토·운영자용 학생 적성 분석 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950">
        <header className="h-14 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-indigo-400">◈</span> Insight
          </span>
          <span className="text-slate-600 text-sm">|</span>
          <span className="text-slate-400 text-sm">멘토·운영자용 적성 분석 대시보드</span>
        </header>
        <main className="max-w-screen-xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
