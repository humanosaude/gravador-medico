'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Facebook, Layers, Image } from 'lucide-react';

const tabs = [
  {
    href: '/admin/ads',
    label: 'META',
    icon: Facebook,
    description: 'Dados do Facebook Ads',
  },
  {
    href: '/admin/ads/hibrido',
    label: 'META + GA4',
    icon: Layers,
    description: 'Análise combinada',
  },
  {
    href: '/admin/ads/criativos',
    label: 'CRIATIVOS',
    icon: Image,
    description: 'Análise de criativos',
  },
];

export default function AdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Submenu de navegação */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 py-3">
            {tabs.map((tab) => {
              const isActive = tab.href === '/admin/ads' 
                ? pathname === '/admin/ads' 
                : pathname.startsWith(tab.href);
              
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="relative"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }
                    `}
                  >
                    <tab.icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : ''}`} />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{tab.label}</span>
                      <span className="text-[10px] opacity-60 hidden sm:block">{tab.description}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl -z-10"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Conteúdo da página */}
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
