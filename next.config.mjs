/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Включаем React Compiler по новой схеме
  reactCompiler: true,
  poweredByHeader: false,
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