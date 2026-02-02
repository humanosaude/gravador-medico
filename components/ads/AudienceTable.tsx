'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  RefreshCw, 
  Search,
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

interface Audience {
  id: string;
  name: string;
  approximate_count: number | null;
  subtype: string;
  subtypeLabel: string;
  delivery_status: {
    code: number;
    description: string;
  } | null;
  operation_status?: {
    code: number;
    description: string;
  } | null;
  time_created: string;
  time_updated: string;
  isLookalike: boolean;
  isReady: boolean;
  lookalike_spec?: {
    ratio: number;
    country: string;
    origin: { id: string; name: string }[];
  };
}

interface Stats {
  total: number;
  lookalikes: number;
  ready: number;
  filling: number;
}

// =====================================================
// COMPONENTE
// =====================================================

export default function AudienceTable() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lookalike' | 'custom' | 'pixel'>('all');

  // Buscar audiences
  const fetchAudiences = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/meta/audiences');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar públicos');
      }

      setAudiences(data.audiences);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudiences();
  }, []);

  // Filtrar audiences
  const filteredAudiences = audiences.filter(aud => {
    const matchesSearch = aud.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterType === 'lookalike') matchesFilter = aud.isLookalike;
    if (filterType === 'custom') matchesFilter = aud.subtype === 'CUSTOM' || aud.subtype === 'DATA_SET';
    if (filterType === 'pixel') matchesFilter = aud.subtype === 'WEBSITE' || aud.subtype === 'ENGAGEMENT';
    
    return matchesSearch && matchesFilter;
  });

  // Formatar número
  const formatCount = (count: number | null) => {
    if (!count) return '-';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count.toString();
  };

  // Status badge
  const getStatusBadge = (audience: Audience) => {
    if (!audience.delivery_status) {
      return (
        <span className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="w-3 h-3" />
          Aguardando
        </span>
      );
    }

    const code = audience.delivery_status.code;
    
    if (code < 200) {
      return (
        <span className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Ativo
        </span>
      );
    }
    
    if (code < 400) {
      return (
        <span className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-500/10 px-2 py-1 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Preenchendo
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded-full">
        <AlertCircle className="w-3 h-3" />
        {audience.delivery_status.description}
      </span>
    );
  };

  // Type badge
  const getTypeBadge = (audience: Audience) => {
    if (audience.isLookalike) {
      return (
        <span className="flex items-center gap-1 text-purple-400 text-xs bg-purple-500/10 px-2 py-1 rounded-full">
          <TrendingUp className="w-3 h-3" />
          Lookalike
          {audience.lookalike_spec && ` ${(audience.lookalike_spec.ratio * 100).toFixed(0)}%`}
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1 text-blue-400 text-xs bg-blue-500/10 px-2 py-1 rounded-full">
        <Target className="w-3 h-3" />
        {audience.subtypeLabel}
      </span>
    );
  };

  // Copiar ID
  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    // Feedback visual pode ser adicionado aqui
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Gestão de Públicos</h2>
              <p className="text-sm text-gray-400">Custom Audiences e Lookalikes da Meta</p>
            </div>
          </div>
          
          <button
            onClick={fetchAudiences}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total de Públicos</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <p className="text-2xl font-bold text-purple-400">{stats.lookalikes}</p>
              <p className="text-xs text-gray-400">Lookalikes</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <p className="text-2xl font-bold text-green-400">{stats.ready}</p>
              <p className="text-xs text-gray-400">Prontos</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <p className="text-2xl font-bold text-yellow-400">{stats.filling}</p>
              <p className="text-xs text-gray-400">Preenchendo</p>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar público..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="all">Todos os tipos</option>
            <option value="lookalike">Apenas Lookalikes</option>
            <option value="custom">Personalizados</option>
            <option value="pixel">Pixel/Engajamento</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchAudiences}
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredAudiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">Nenhum público encontrado</p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm ? 'Tente outro termo de busca' : 'Configure seus públicos no Meta Business Manager'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Nome
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tamanho
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Atualizado
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredAudiences.map((audience) => (
                <tr 
                  key={audience.id} 
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-gray-200 font-medium">{audience.name}</p>
                      <p className="text-gray-500 text-xs mt-1">ID: {audience.id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTypeBadge(audience)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-lg font-semibold ${
                      !audience.approximate_count ? 'text-gray-500' :
                      audience.approximate_count >= 10000 ? 'text-green-400' :
                      audience.approximate_count >= 1000 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {formatCount(audience.approximate_count)}
                    </span>
                    {audience.approximate_count && audience.approximate_count < 1000 && (
                      <p className="text-red-400 text-xs mt-1">Muito pequeno</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(audience)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-400 text-sm">
                      {new Date(audience.time_updated).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => copyId(audience.id)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Copiar ID"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`https://business.facebook.com/audiences/${audience.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Ver no Meta"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
