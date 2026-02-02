'use client';

// =====================================================
// PÁGINA: ESCALA AUTOMÁTICA DE ADS
// =====================================================
// Permite criar campanhas automaticamente e visualizar
// o histórico de otimizações
// =====================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket, 
  Activity, 
  Sparkles, 
  ArrowRight,
  CheckCircle,
  Zap,
  Brain,
  Target,
  TrendingUp,
} from 'lucide-react';
import AdsLauncherPro from '@/components/ads/AdsLauncherPro';
import AdsDashboard from '@/components/ads/AdsDashboard';
import OptimizationPanel from '@/components/ads/OptimizationPanel';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function EscalaAutomaticaPage() {
  const [activeTab, setActiveTab] = useState<'launcher' | 'optimizer'>('launcher');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Escala Automática de Ads
              </h1>
              <p className="text-gray-300">
                Crie e otimize campanhas no Facebook com inteligência artificial
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-start gap-3 p-4 bg-purple-900/30 border border-purple-700/50 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-100">
                  Copy com IA
                </h3>
                <p className="text-sm text-purple-300">
                  GPT-4o gera textos otimizados para conversão
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-900/30 border border-blue-700/50 rounded-xl">
              <Target className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-100">
                  Targeting Inteligente
                </h3>
                <p className="text-sm text-blue-300">
                  Segmentação automática por público-alvo
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-emerald-900/30 border border-emerald-700/50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-100">
                  Otimização Automática
                </h3>
                <p className="text-sm text-emerald-300">
                  Pausa perdedores e escala vencedores
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 p-1 bg-gray-800/80 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('launcher')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'launcher'
                ? 'bg-gray-700 text-purple-400 shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Rocket className="w-5 h-5" />
            Criar Campanha
          </button>
          <button
            onClick={() => setActiveTab('optimizer')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'optimizer'
                ? 'bg-gray-700 text-emerald-400 shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5" />
            Auditor
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'launcher' ? (
              <>
                <AdsLauncherPro />
                <AdsDashboard />
              </>
            ) : (
              <OptimizationPanel />
            )}
          </motion.div>
        </div>

        {/* Como Funciona */}
        <div className="mt-12 bg-gray-900/80 rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">
            Como Funciona
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: 1,
                title: 'Upload de Criativos',
                description: 'Faça upload de suas imagens e vídeos',
                icon: <Rocket className="w-6 h-6" />,
              },
              {
                step: 2,
                title: 'IA Gera Copys',
                description: 'GPT-4o cria textos otimizados para conversão',
                icon: <Brain className="w-6 h-6" />,
              },
              {
                step: 3,
                title: 'Publicação no Facebook',
                description: 'Campanha, AdSet e Ads criados automaticamente',
                icon: <Zap className="w-6 h-6" />,
              },
              {
                step: 4,
                title: 'Otimização Contínua',
                description: 'Sistema pausa perdedores e escala vencedores',
                icon: <TrendingUp className="w-6 h-6" />,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-4">
                    {item.icon}
                  </div>
                  <div className="absolute top-7 left-14 right-0 h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent hidden lg:block" style={{ display: index === 3 ? 'none' : undefined }} />
                  <span className="text-xs font-bold text-purple-400 mb-2">
                    PASSO {item.step}
                  </span>
                  <h3 className="font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regras de Otimização */}
        <div className="mt-8 bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-2xl p-8 border border-amber-700/50">
          <h2 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Regras de Otimização Automática
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 font-bold text-sm">⏸️</span>
              </div>
              <div>
                <h4 className="font-semibold text-amber-100">
                  Pausa Automática
                </h4>
                <p className="text-sm text-amber-200/80">
                  Se o anúncio gastar mais de <strong>R$ 50</strong> sem nenhuma venda, 
                  ele será <strong>pausado automaticamente</strong> para evitar desperdício.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-900/50 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 font-bold text-sm">📈</span>
              </div>
              <div>
                <h4 className="font-semibold text-amber-100">
                  Escala Automática
                </h4>
                <p className="text-sm text-amber-200/80">
                  Se o anúncio tiver <strong>ROAS maior que 3x</strong>, 
                  o budget do AdSet será <strong>aumentado em 20%</strong> automaticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
