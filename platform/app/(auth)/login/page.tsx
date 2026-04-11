"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md px-6">
        <div className="card flex flex-col gap-6">
          {/* 로고 */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-100">ICARUS</h1>
            <p className="text-slate-400 text-sm mt-1">AI 기반 교육 현장 플랫폼</p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">이메일</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">비밀번호</label>
              <input
                type="password"
                className="input"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center">
            계정이 없으면 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
