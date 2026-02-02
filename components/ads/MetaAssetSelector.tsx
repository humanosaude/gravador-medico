'use client';

/**
 * MetaAssetSelector - Componente para selecionar ativos da Meta
 * 
 * Permite selecionar:
 * - Conta de Anúncio
 * - Página do Facebook
 * - Pixel
 * - Conta do Instagram (opcional)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Facebook,
  Instagram,
  BarChart3,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Save,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface MetaAsset {
  id: string;
  name: string;
  account_status?: number;
  currency?: string;
  category?: string;
  username?: string;
  followers_count?: number;
  instagram_id?: string; // Instagram Business Account vinculado à página
}

interface MetaAssets {
  adAccounts: MetaAsset[];
  pages: MetaAsset[];
  pixels: MetaAsset[];
  instagramAccounts: MetaAsset[];
  savedSettings?: {
    meta_ad_account_id?: string;
    meta_page_id?: string;
    meta_pixel_id?: string;
    meta_instagram_id?: string;
    meta_instagram_actor_id?: string; // Instagram vinculado à página
  };
}

interface SelectedAssets {
  adAccountId: string;
  adAccountName: string;
  pageId: string;
  pageName: string;
  pixelId: string;
  pixelName: string;
  instagramId: string;
  instagramName: string;
  instagramActorId: string; // Instagram vinculado à página (para Feed/Stories)
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MetaAssetSelector() {
  const [assets, setAssets] = useState<MetaAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selected, setSelected] = useState<SelectedAssets>({
    adAccountId: '',
    adAccountName: '',
    pageId: '',
    pageName: '',
    pixelId: '',
    pixelName: '',
    instagramId: '',
    instagramName: '',
    instagramActorId: ''
  });

  // Carregar ativos da Meta
  const loadAssets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/meta/assets');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar ativos');
      }

      setAssets(data.data);

      // Pré-selecionar configuração salva (se existir)
      if (data.data.savedSettings) {
        const saved = data.data.savedSettings;
        setSelected({
          adAccountId: saved.meta_ad_account_id || '',
          adAccountName: saved.meta_ad_account_name || '',
          pageId: saved.meta_page_id || '',
          pageName: saved.meta_page_name || '',
          pixelId: saved.meta_pixel_id || '',
          pixelName: saved.meta_pixel_name || '',
          instagramId: saved.meta_instagram_id || '',
          instagramName: saved.meta_instagram_name || '',
          instagramActorId: saved.meta_instagram_actor_id || ''
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Recarregar pixels quando mudar a conta de anúncio
  const reloadPixels = async (adAccountId: string) => {
    try {
      const response = await fetch(`/api/meta/assets?adAccountId=${adAccountId}`);
      const data = await response.json();
      
      if (data.success && data.data.pixels) {
        setAssets(prev => prev ? { ...prev, pixels: data.data.pixels } : null);
      }
    } catch (err) {
      console.error('Erro ao recarregar pixels:', err);
    }
  };

  // Salvar configuração
  const handleSave = async () => {
    if (!selected.adAccountId) {
      setError('Selecione pelo menos uma Conta de Anúncio');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/meta/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao salvar');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // Handler para seleção
  const handleSelect = (type: keyof SelectedAssets, value: string, name: string) => {
    const nameKey = type.replace('Id', 'Name') as keyof SelectedAssets;
    setSelected(prev => ({
      ...prev,
      [type]: value,
      [nameKey]: name
    }));

    // Se mudou conta de anúncio, recarregar pixels
    if (type === 'adAccountId' && value) {
      reloadPixels(value);
    }
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando ativos da Meta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-500" />
            Configurações Meta Ads
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Selecione quais ativos a IA deve usar para criar campanhas
          </p>
        </div>
        <button
          onClick={loadAssets}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          title="Recarregar"
        >
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Erro</p>
              <p className="text-red-300/80 text-sm">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-green-400" />
            <p className="text-green-400 font-medium">Configuração salva com sucesso!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdowns */}
      <div className="space-y-6">
        {/* Conta de Anúncio */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Conta de Anúncio *
          </label>
          <div className="relative">
            <select
              value={selected.adAccountId}
              onChange={(e) => {
                const asset = assets?.adAccounts.find(a => a.id === e.target.value);
                handleSelect('adAccountId', e.target.value, asset?.name || '');
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            >
              <option value="">Selecione uma conta...</option>
              {assets?.adAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (ID: {acc.id}) {acc.currency && `- ${acc.currency}`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {assets?.adAccounts.length === 0 && (
            <p className="mt-2 text-sm text-yellow-400">
              Nenhuma conta encontrada. Verifique as permissões do token.
            </p>
          )}
        </div>

        {/* Página do Facebook */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Facebook className="w-4 h-4 text-blue-500" />
            Página do Facebook
          </label>
          <div className="relative">
            <select
              value={selected.pageId}
              onChange={(e) => {
                const asset = assets?.pages.find(p => p.id === e.target.value);
                // Captura automaticamente o Instagram Actor ID vinculado à página
                setSelected(prev => ({
                  ...prev,
                  pageId: e.target.value,
                  pageName: asset?.name || '',
                  instagramActorId: asset?.instagram_id || ''
                }));
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            >
              <option value="">Selecione uma página...</option>
              {assets?.pages.map(page => (
                <option key={page.id} value={page.id}>
                  {page.name} {page.category && `(${page.category})`} {page.instagram_id ? '✅ Insta' : '⚠️ Sem Insta'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {selected.pageId && !selected.instagramActorId && (
            <p className="mt-2 text-sm text-yellow-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Esta página não tem Instagram vinculado. Anúncios em Stories/Reels podem falhar.
            </p>
          )}
          {selected.instagramActorId && (
            <p className="mt-2 text-sm text-green-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Instagram Business Account vinculado automaticamente
            </p>
          )}
        </div>

        {/* Pixel */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Pixel de Conversão
          </label>
          <div className="relative">
            <select
              value={selected.pixelId}
              onChange={(e) => {
                const asset = assets?.pixels.find(p => p.id === e.target.value);
                handleSelect('pixelId', e.target.value, asset?.name || '');
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            >
              <option value="">Selecione um pixel...</option>
              {assets?.pixels.map(pixel => (
                <option key={pixel.id} value={pixel.id}>
                  {pixel.name} (ID: {pixel.id})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {selected.adAccountId && assets?.pixels.length === 0 && (
            <p className="mt-2 text-sm text-yellow-400">
              Nenhum pixel encontrado nesta conta.
            </p>
          )}
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-400" />
            Conta do Instagram (opcional)
          </label>
          <div className="relative">
            <select
              value={selected.instagramId}
              onChange={(e) => {
                const asset = assets?.instagramAccounts.find(ig => ig.id === e.target.value);
                handleSelect('instagramId', e.target.value, asset?.name || asset?.username || '');
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500"
            >
              <option value="">Selecione uma conta...</option>
              {assets?.instagramAccounts.map(ig => (
                <option key={ig.id} value={ig.id}>
                  @{ig.username || ig.name} {ig.followers_count && `(${ig.followers_count.toLocaleString()} seguidores)`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Preview da Seleção */}
      {selected.adAccountId && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Resumo da Configuração</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Conta:</span>
              <span className="text-white ml-2">{selected.adAccountName || selected.adAccountId}</span>
            </div>
            {selected.pageId && (
              <div>
                <span className="text-gray-500">Página:</span>
                <span className="text-white ml-2">{selected.pageName}</span>
              </div>
            )}
            {selected.pixelId && (
              <div>
                <span className="text-gray-500">Pixel:</span>
                <span className="text-white ml-2">{selected.pixelName}</span>
              </div>
            )}
            {selected.instagramId && (
              <div>
                <span className="text-gray-500">Instagram:</span>
                <span className="text-white ml-2">@{selected.instagramName}</span>
              </div>
            )}
            {selected.instagramActorId && (
              <div>
                <span className="text-gray-500">Insta Actor:</span>
                <span className="text-green-400 ml-2">✅ {selected.instagramActorId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="mt-6 flex items-center justify-between">
        <a
          href="https://business.facebook.com/settings/ad-accounts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          Gerenciar no Meta Business Suite
        </a>

        <button
          onClick={handleSave}
          disabled={!selected.adAccountId || saving}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-xl flex items-center gap-2 transition-all duration-200 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Configuração Padrão
            </>
          )}
        </button>
      </div>
    </div>
  );
}
