import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/v1",
    NEXT_PUBLIC_STT_WS:   process.env.NEXT_PUBLIC_STT_WS   ?? "ws://localhost:8001/stt",
  },
};

export default nextConfig;
