import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/shared/Navbar";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ICARUS Platform",
  description: "AI 기반 교육 현장 통합 플랫폼",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="ko">
      <body>
        <SessionProvider session={session}>
          {session?.user && <Navbar role={(session.user as { role?: string }).role ?? "student"} />}
          <main className="min-h-screen">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
