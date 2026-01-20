"use client"

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UAParser } from 'ua-parser-js'
import { v4 as uuidv4 } from 'uuid'

/**
 * 🚀 ANALYTICS TRACKER NÍVEL NASA
 * 
 * Sistema de rastreamento profissional que captura:
 * - Device/OS/Browser (via ua-parser-js)
 * - Geolocalização (city, country, region passados do servidor via props)
 * - UTM Parameters (campanhas de marketing)
 * - Facebook Cookies (_fbp, _fbc) para CAPI
 * - Google Click ID (gclid)
 * - Session ID persistente (localStorage)
 * 
 * ✅ SOLUÇÃO: Recebe city/country/region do layout.tsx (Server Component)
 * porque os headers da Vercel só existem no servidor!
 */

// Interface para Props que vêm do Server Component (layout.tsx)
interface AnalyticsProps {
  city?: string | null
  country?: string | null
  region?: string | null
}

export default function AnalyticsTracker({ city, country, region }: AnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    trackPageView()
  }, [pathname, searchParams, city, country, region])

  /**
   * Extrai um cookie específico do navegador
   */
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=')
      if (key === name) return decodeURIComponent(value)
    }
    return null
  }

  /**
   * Extrai o domínio do referrer
   * Ex: https://www.instagram.com/p/xyz → instagram.com
   */
  const extractDomain = (url: string): string | null => {
    if (!url) return null
    try {
      const hostname = new URL(url).hostname
      return hostname.replace('www.', '')
    } catch {
      return null
    }
  }

  const trackPageView = async () => {
    try {
      // ============================================
      // 1. SESSÃO (Persistente no localStorage)
      // ============================================
      let sessionId = localStorage.getItem('analytics_session_id')
      if (!sessionId) {
        sessionId = uuidv4()
        localStorage.setItem('analytics_session_id', sessionId)
        console.log('🆕 Nova sessão criada:', sessionId)
      }

      // ============================================
      // 2. DEVICE/OS/BROWSER (ua-parser-js v2.0)
      // ============================================
      const parser = new UAParser(navigator.userAgent)
      const result = parser.getResult()

      const deviceType = result.device?.type || 'desktop' // mobile, tablet, desktop
      const os = result.os?.name || 'Desconhecido' // iOS, Android, Windows, macOS
      const browser = result.browser?.name || 'Desconhecido' // Chrome, Safari, Firefox
      const browserVersion = result.browser?.version || ''

      // ============================================
      // 3. UTM PARAMETERS (Campanhas de Marketing)
      // ============================================
      const utmSource = searchParams?.get('utm_source') || null
      const utmMedium = searchParams?.get('utm_medium') || null
      const utmCampaign = searchParams?.get('utm_campaign') || null
      const utmContent = searchParams?.get('utm_content') || null
      const utmTerm = searchParams?.get('utm_term') || null

      // Salvar UTMs no sessionStorage (para manter durante a navegação)
      if (utmSource) sessionStorage.setItem('utm_source', utmSource)
      if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium)
      if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign)

      // Recuperar UTMs salvos (caso página atual não tenha UTM na URL)
      const savedUtmSource = utmSource || sessionStorage.getItem('utm_source')
      const savedUtmMedium = utmMedium || sessionStorage.getItem('utm_medium')
      const savedUtmCampaign = utmCampaign || sessionStorage.getItem('utm_campaign')

      // ============================================
      // 4. GOOGLE/FACEBOOK CLICK IDs (Para CAPI)
      // ============================================
      const gclid = searchParams?.get('gclid') || null // Google Ads
      const fbclid = searchParams?.get('fbclid') || null // Facebook Ads

      // Facebook Cookies (_fbp e _fbc) - Crucial para API de Conversão
      const fbp = getCookie('_fbp')
      const fbc = getCookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null)

      // ============================================
      // 5. REFERRER (De onde o usuário veio)
      // ============================================
      const referrer = document.referrer || null
      const referrerDomain = referrer ? extractDomain(referrer) : null

      // ============================================
      // 6. SALVAR COM GEO (vindo do servidor via props)
      // ============================================
      const visitDataBase = {
        page_path: pathname,
        session_id: sessionId,
        device_type: deviceType,
        os: os,
        browser: browser,
        browser_version: browserVersion,
        user_agent: navigator.userAgent,
        referrer: referrer,
        referrer_domain: referrerDomain,
        utm_source: savedUtmSource,
        utm_medium: savedUtmMedium,
        utm_campaign: savedUtmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        gclid: gclid,
        fbclid: fbclid,
        fbc: fbc,
        fbp: fbp,
        is_online: true,
        last_seen: new Date().toISOString(),
        // ✅ GEO vem do SERVER (layout.tsx lê headers da Vercel)
        city: city || null,
        country: country || null,
        region: region || null,
        ip_address: null // IP não é exposto nos headers por privacidade
      }

      // Salvar IMEDIATAMENTE (sem esperar geo)
      const { data: insertedVisit, error } = await supabase
        .from('analytics_visits')
        .insert(visitDataBase)
        .select()
        .single()

      if (error) {
        console.error('❌ Erro ao registrar visita:', error)
        return
      }

      console.log('✅ Visita registrada:', {
        page: pathname,
        device: deviceType,
        os: os,
        browser: browser,
        city: city || 'Desconhecida',
        country: country || 'Desconhecido',
        source: savedUtmSource || referrerDomain || 'direto'
      })

    } catch (err) {
      console.error('💥 Erro no analytics tracker:', err)
    }
  }

  return null // Componente invisível
}
