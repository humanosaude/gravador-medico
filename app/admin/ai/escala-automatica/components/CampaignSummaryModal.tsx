'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, CheckCircle, AlertCircle, Megaphone, Layers, Image as ImageIcon } from 'lucide-react';

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  adSetId: string;
  adSetName: string;
  adIds: string[];
  budget: number;
  objective: string;
  status: 'PAUSED' | 'ACTIVE';
  adAccountId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summary: CampaignSummary | null;
}

export default function CampaignSummaryModal({ isOpen, onClose, summary }: Props) {
  if (!isOpen || !summary) return null;
  
  const adAccountId = summary.adAccountId || '1559431300891081';
  
  const urls = {
    campaign: `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${summary.campaignId}`,
    adSet: `https://business.facebook.com/adsmanager/manage/adsets?act=${adAccountId}&selected_adset_ids=${summary.adSetId}`,
    ads: summary.adIds.length > 0 
      ? `https://business.facebook.com/adsmanager/manage/ads?act=${adAccountId}&selected_ad_ids=${summary.adIds.join(',')}`
      : `https://business.facebook.com/adsmanager/manage/ads?act=${adAccountId}`,
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-green-500/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">🎉 Campanha Criada!</h2>
                  <p className="text-green-100 text-sm">Publicada com sucesso no Meta Ads</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status Alert */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200 font-semibold mb-1">
                    {summary.status === 'PAUSED' ? '⏸️ Campanha Pausada' : '⏰ Processamento em Andamento'}
                  </p>
                  <p className="text-yellow-100/80 text-sm">
                    {summary.status === 'PAUSED' 
                      ? 'A campanha foi criada como PAUSADA. Ative manualmente no Meta Ads quando estiver pronto para veicular.'
                      : 'A campanha pode levar até 10 minutos para aparecer no painel do Meta Ads Manager.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="space-y-4">
              {/* Campanha */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-purple-400" />
                    Campanha
                  </h3>
                  <a
                    href={urls.campaign}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
                  >
                    Abrir no Meta Ads
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-gray-300 text-sm mb-1 truncate" title={summary.campaignName}>
                  {summary.campaignName}
                </p>
                <p className="text-gray-500 text-xs font-mono">ID: {summary.campaignId}</p>
              </div>

              {/* AdSet */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-400" />
                    Conjunto de Anúncios
                  </h3>
                  <a
                    href={urls.adSet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
                  >
                    Ver Detalhes
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-gray-300 text-sm mb-1 truncate" title={summary.adSetName}>
                  {summary.adSetName}
                </p>
                <p className="text-gray-500 text-xs font-mono mb-3">ID: {summary.adSetId}</p>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-gray-400">
                    💰 Orçamento: <span className="text-green-400 font-semibold">R$ {summary.budget.toFixed(2)}/dia</span>
                  </span>
                  <span className="text-gray-400">
                    🎯 Objetivo: <span className="text-purple-400 font-semibold">{summary.objective}</span>
                  </span>
                </div>
              </div>

              {/* Anúncios */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-green-400" />
                    Anúncios ({summary.adIds.length || '⏳'})
                  </h3>
                  {summary.adIds.length > 0 && (
                    <a
                      href={urls.ads}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
                    >
                      Ver Todos
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {summary.adIds.length > 0 ? (
                  <div className="space-y-1">
                    {summary.adIds.slice(0, 5).map((id, index) => (
                      <p key={id} className="text-gray-400 text-xs font-mono">
                        Anúncio {index + 1}: {id}
                      </p>
                    ))}
                    {summary.adIds.length > 5 && (
                      <p className="text-gray-500 text-xs">
                        ... e mais {summary.adIds.length - 5} anúncio(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-yellow-400 text-sm">
                    ⏳ Os anúncios serão criados em breve...
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <a
                href={urls.campaign}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir no Meta Ads
              </a>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
