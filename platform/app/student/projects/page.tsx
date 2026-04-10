"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getMicroProjects } from "@/lib/api";
import type { MicroProject } from "@/lib/types";
import MicroProjectList from "@/components/student/MicroProjectList";

export default function StudentProjectsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { user_id?: string })?.user_id ?? "";
  const [projects, setProjects] = useState<MicroProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getMicroProjects(userId)
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">마이크로 프로젝트 포트폴리오</h1>
        <p className="text-slate-400 text-sm mt-0.5">Wing 에이전트가 생성한 프로젝트 목록</p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">불러오는 중…</p>
      ) : (
        <div className="card">
          <MicroProjectList projects={projects} />
        </div>
      )}
    </div>
  );
}
