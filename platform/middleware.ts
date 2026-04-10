import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_REDIRECT: Record<string, string> = {
  student:    "/student",
  instructor: "/instructor",
  admin:      "/admin",
  mentor:     "/mentor",
};

export default auth(async function middleware(req) {
  const session = (req as unknown as { auth: { user?: { role?: string } } | null }).auth;
  const { pathname } = req.nextUrl;

  // 로그인 페이지는 통과
  if (pathname === "/login") {
    // 이미 로그인 → 역할 페이지로 리다이렉트
    if (session?.user?.role) {
      const dest = ROLE_REDIRECT[session.user.role] ?? "/student";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // 미인증 → 로그인
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user.role ?? "student";

  // 루트 → 역할 홈으로
  if (pathname === "/") {
    return NextResponse.redirect(new URL(ROLE_REDIRECT[role] ?? "/student", req.url));
  }

  // 역할 미스매치 차단
  const routeRole = pathname.split("/")[1]; // student | instructor | admin | mentor
  if (ROLE_REDIRECT[routeRole] && role !== routeRole && role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_REDIRECT[role] ?? "/student", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
