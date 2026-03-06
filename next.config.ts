/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*"], 

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ptdezfwyamskazfwswxh.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://ptdezfwyamskazfwswxh.supabase.co wss://ptdezfwyamskazfwswxh.supabase.co https://challenges.cloudflare.com;",
          },
        ],
      },
    ];
  },

experimental: {
    // Bersih dari fitur yang belum stabil
  },

  // INI MANTRA BARU YANG BENAR UNTUK NEXT.JS 15+ BOS!
  devIndicators: false,
};

export default nextConfig;