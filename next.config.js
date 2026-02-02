/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  
  // Configuração de imagens externas (Supabase Storage, Facebook CDN)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'egsmraszqnmosmtjuzhx.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent.*.fbcdn.net',
        pathname: '/**',
      },
    ],
  },
  
  // Headers de segurança com CSP atualizado para Meta/Facebook
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.run.app https://*.conversionsapigateway.com https://graph.facebook.com https://www.facebook.com https://connect.facebook.net https://api.mercadopago.com https://api.mercadopago.com.br https://*.mercadolibre.com https://*.mercadopago.com https://secure-fields.mercadopago.com https://*.mlstatic.com https://events.mercadopago.com https://api.appmax.com.br https://www.google-analytics.com https://www.googletagmanager.com https://*.apify.com https://*.openai.com",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self' https://www.facebook.com https://web.facebook.com https://www.youtube.com",
              "worker-src 'self' blob:",
            ].join('; ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
