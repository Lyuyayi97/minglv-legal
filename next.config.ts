import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/legal.sqlite"],
  },
};

export default nextConfig;
