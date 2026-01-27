import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Suspense } from 'react'
import { headers } from 'next/headers' // ✅ Importar headers
import AnalyticsTracker from '@/components/AnalyticsTracker'
import WhatsAppFloating from '@/components/WhatsAppFloating'
import { ToastProvider } from '@/components/ui/toast' // ✅ Provider para notificações
import { Toaster } from 'sonner' // ✅ Toast visual
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Gravador Médico - Prontuário pronto enquanto conversa",
  description: "Transforme consultas em documentação completa sem digitar uma palavra. O problema não é o prontuário. É a digitação. Econize até 3 horas por dia.",
  icons: {
    icon: '/images/novo-icon-gravadormedico.png',
    shortcut: '/images/novo-icon-gravadormedico.png',
    apple: '/images/novo-icon-gravadormedico.png',
  },
  openGraph: {
    title: "Gravador Médico - Prontuário pronto enquanto conversa",
    description: "Transforme consultas em documentação completa sem digitar uma palavra. Econize até 3 horas por dia.",
    url: "https://www.gravadormedico.com.br",
    siteName: "Gravador Médico",
    images: [
      {
        url: "/images/novo-icon-gravadormedico.png",
        width: 1200,
        height: 630,
        alt: "Gravador Médico - Prontuário pronto enquanto conversa",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gravador Médico - Prontuário pronto enquanto conversa",
    description: "Transforme consultas em documentação completa sem digitar uma palavra. Econize até 3 horas por dia.",
    images: ["/images/novo-icon-gravadormedico.png"],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Permite zoom manual (acessibilidade)
  userScalable: true,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ CAPTURAR GEOLOCALIZAÇÃO DA VERCEL (Server-Side)
  const headersList = await headers()
  const city = headersList.get('x-vercel-ip-city') 
    ? decodeURIComponent(headersList.get('x-vercel-ip-city')!) 
    : null
  const country = headersList.get('x-vercel-ip-country')
  const region = headersList.get('x-vercel-ip-country-region')

  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-QPXT7Q09T3"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-QPXT7Q09T3');
            `,
          }}
        />
        {/* End Google tag */}

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1430691785287241');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1430691785287241&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}

        {/* Mercado Pago SDK */}
        <script src="https://sdk.mercadopago.com/js/v2" />
      </head>
      <body className={`${plusJakartaSans.className} bg-white`}>
        <ToastProvider>
          <Toaster 
            position="bottom-right" 
            className="z-[9999]"
            toastOptions={{
              style: {
                zIndex: 9999,
              }
            }}
          />
          
          {/* Analytics Tracker - rastreia visitas automaticamente */}
          <Suspense fallback={null}>
            <AnalyticsTracker city={city} country={country} region={region} />
          </Suspense>
          
          {/* WhatsApp Floating Button */}
          <WhatsAppFloating />
          
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
