"use client";

import ClassOverview from "@/components/instructor/ClassOverview";

export default function InstructorStudentsPage() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">내 반 학생 현황</h1>
        <p className="text-slate-400 text-sm mt-0.5">15초마다 자동 갱신됩니다.</p>
      </div>
      <ClassOverview pollInterval={15_000} />
    </div>
  );
}
