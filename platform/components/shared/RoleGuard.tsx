"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!allowedRoles.includes(role ?? "")) {
      router.push("/");
    }
  }, [session, status, role, allowedRoles, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm animate-pulse">로딩 중…</span>
      </div>
    );
  }

  if (!session || !allowedRoles.includes(role ?? "")) return null;

  return <>{children}</>;
}
