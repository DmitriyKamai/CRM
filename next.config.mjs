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
  /** Меньше шансов упасть в ESLint-воркере при сборке; полная проверка: npm run lint */
  eslint: {
    ignoreDuringBuilds: true
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