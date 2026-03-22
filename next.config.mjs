/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * React Compiler: по умолчанию выкл. (на Windows + тяжёлая сборка часто даёт 0xC0000005).
   * Включить: NEXT_REACT_COMPILER=1
   */
  reactCompiler: process.env.NEXT_REACT_COMPILER === "1",
  poweredByHeader: false,
  serverExternalPackages: ["country-state-city"],
  /**
   * Windows / 0xC0000005 после этапов сборки:
   * - cpus — меньше дочерних процессов при «Collecting page data» (NEXT_BUILD_CPUS=1).
   * - workerThreads — static/analysis воркеры через worker_threads вместо child_process (меньше падений при fork).
   * - webpackBuildWorker: false — компиляция webpack в основном процессе, без отдельного jest-worker child.
   */
  experimental: {
    ...(process.platform === "win32"
      ? {
          cpus:
            Number.parseInt(process.env.NEXT_BUILD_CPUS ?? "", 10) || 2,
          workerThreads: true,
          webpackBuildWorker: false
        }
      : {})
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  // Разрешить запросы к dev-серверу с других устройств в сети (напр. с телефона по http://192.168.1.10:3000)
  allowedDevOrigins: ["http://192.168.1.10:3000", "http://192.168.1.10"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          }
        ]
      }
    ];
  }
};

export default nextConfig;