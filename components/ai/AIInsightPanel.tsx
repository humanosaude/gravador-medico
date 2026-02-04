'use client';

/**
 * 🧠 Componente de Insights da IA
 * 
 * Componente reutilizável para exibir análises geradas pela IA
 * com animações e visual moderno
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Target,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Clock,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

export interface AIInsight {
  category?: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  metric?: string;
  recommendation?: string;
}

export interface AIAction {
  priority: number;
  action: string;
  reason: string;
  expectedImpact: string;
  urgency: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
}

export interface AIAnalysisProps {
  type: 'analytics' | 'cockpit' | 'consolidated';
  loading?: boolean;
  error?: string;
  summary?: string;
  healthScore?: number;
  accountStatus?: 'SAUDÁVEL' | 'ATENÇÃO' | 'CRÍTICO';
  insights?: AIInsight[];
  actions?: AIAction[];
  recommendations?: string[];
  trends?: {
    direction: 'up' | 'down' | 'stable';
    description: string;
  };
  executiveSummary?: {
    verdict: string;
    spendEfficiency: number;
    biggestWin: string;
    biggestThreat: string;
  };
  generatedAt?: string;
  onRefresh?: () => void;
  onAskQuestion?: (question: string) => void;
}

// =====================================================
// HELPERS
// =====================================================

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case 'danger': return <AlertTriangle className="w-5 h-5 text-red-400" />;
    default: return <Info className="w-5 h-5 text-blue-400" />;
  }
};

const getSeverityColors = (severity: string) => {
  switch (severity) {
    case 'success': return 'bg-green-500/10 border-green-500/30 text-green-300';
    case 'warning': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
    case 'danger': return 'bg-red-500/10 border-red-500/30 text-red-300';
    default: return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SAUDÁVEL': return 'text-green-400 bg-green-500/20';
    case 'ATENÇÃO': return 'text-yellow-400 bg-yellow-500/20';
    case 'CRÍTICO': return 'text-red-400 bg-red-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'CRÍTICO': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'ALTO': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'MÉDIO': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'BAIXO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getHealthScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
};

const getTrendIcon = (direction: string) => {
  switch (direction) {
    case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
    default: return <ArrowRight className="w-4 h-4 text-gray-400" />;
  }
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function AIInsightPanel({
  type,
  loading,
  error,
  summary,
  healthScore,
  accountStatus,
  insights,
  actions,
  recommendations,
  trends,
  executiveSummary,
  generatedAt,
  onRefresh,
  onAskQuestion
}: AIAnalysisProps) {
  const [expanded, setExpanded] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [showAllActions, setShowAllActions] = useState(false);
  
  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-blue-900/20 rounded-2xl border border-purple-500/20 p-6"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-ping" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              IA Analisando Dados...
            </h3>
            <p className="text-sm text-gray-400">Processando métricas com GPT-4o</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-900/20 rounded-2xl border border-red-500/30 p-6"
      >
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-300">Erro na Análise</h3>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          )}
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-blue-900/20 rounded-2xl border border-purple-500/20 overflow-hidden"
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Brain className="w-6 h-6 text-white" />
          </div>
          {healthScore !== undefined && (
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-900 border-2 ${
              healthScore >= 70 ? 'border-green-500' : healthScore >= 40 ? 'border-yellow-500' : 'border-red-500'
            } flex items-center justify-center`}>
              <span className={`text-xs font-bold ${getHealthScoreColor(healthScore)}`}>
                {healthScore}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">
              {type === 'analytics' ? 'Análise de Tráfego' : 
               type === 'cockpit' ? 'Análise de Campanhas' : 
               'Análise Consolidada'}
            </h3>
            <span className="px-2 py-0.5 bg-purple-500/20 rounded-full text-xs text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              GPT-4o
            </span>
            {accountStatus && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(accountStatus)}`}>
                {accountStatus}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 line-clamp-1">
            {summary || 'Análise inteligente das métricas'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Atualizar análise"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>
      
      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-purple-500/20"
          >
            <div className="p-4 space-y-4">
              {/* Executive Summary */}
              {executiveSummary && (
                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Target className="w-4 h-4" />
                    <span className="text-sm font-medium">Resumo Executivo</span>
                  </div>
                  <p className="text-white">{executiveSummary.verdict}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                      <span className="text-xs text-green-400">🏆 Maior Vitória</span>
                      <p className="text-sm text-white mt-1">{executiveSummary.biggestWin}</p>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                      <span className="text-xs text-red-400">⚠️ Maior Ameaça</span>
                      <p className="text-sm text-white mt-1">{executiveSummary.biggestThreat}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Trends */}
              {trends && (
                <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                  {getTrendIcon(trends.direction)}
                  <span className="text-sm text-gray-300">{trends.description}</span>
                </div>
              )}
              
              {/* Actions */}
              {actions && actions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-300 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Ações Imediatas
                    </span>
                    {actions.length > 3 && (
                      <button
                        onClick={() => setShowAllActions(!showAllActions)}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        {showAllActions ? 'Ver menos' : `Ver todas (${actions.length})`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(showAllActions ? actions : actions.slice(0, 3)).map((action, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`rounded-lg p-3 border ${getUrgencyColor(action.urgency)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">#{action.priority}</span>
                            <div>
                              <p className="text-sm font-medium text-white">{action.action}</p>
                              <p className="text-xs text-gray-400 mt-1">{action.reason}</p>
                              {action.expectedImpact && (
                                <p className="text-xs text-green-400 mt-1">💡 {action.expectedImpact}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${getUrgencyColor(action.urgency)}`}>
                            {action.urgency}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Insights */}
              {insights && insights.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-purple-300 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Insights
                  </span>
                  <div className="grid gap-2">
                    {insights.slice(0, 4).map((insight, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`rounded-lg p-3 border ${getSeverityColors(insight.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(insight.severity)}
                          <div>
                            <p className="text-sm font-medium text-white">{insight.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{insight.description}</p>
                            {insight.recommendation && (
                              <p className="text-xs text-purple-300 mt-2 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                {insight.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recommendations */}
              {recommendations && recommendations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-purple-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Recomendações
                  </span>
                  <ul className="space-y-1">
                    {recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Chat Input */}
              {onAskQuestion && (
                <div className="pt-2 border-t border-purple-500/20">
                  {!showChat ? (
                    <button
                      onClick={() => setShowChat(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-purple-300 hover:text-purple-200 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Fazer uma pergunta à IA
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        placeholder="Pergunte algo sobre os dados..."
                        className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-purple-500/20 focus:border-purple-500/50 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && chatQuestion.trim()) {
                            onAskQuestion(chatQuestion);
                            setChatQuestion('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (chatQuestion.trim()) {
                            onAskQuestion(chatQuestion);
                            setChatQuestion('');
                          }
                        }}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm font-medium transition-colors"
                      >
                        Enviar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =====================================================
// COMPONENTE COMPACTO (Para sidebars, cards menores)
// =====================================================

export function AIInsightCompact({
  summary,
  healthScore,
  accountStatus,
  loading,
  onExpand
}: {
  summary?: string;
  healthScore?: number;
  accountStatus?: string;
  loading?: boolean;
  onExpand?: () => void;
}) {
  if (loading) {
    return (
      <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/20">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
          <span className="text-sm text-purple-300">Analisando...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/20 cursor-pointer hover:bg-purple-900/30 transition-colors"
      onClick={onExpand}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-white">IA Insight</span>
        </div>
        {healthScore !== undefined && (
          <span className={`text-lg font-bold ${getHealthScoreColor(healthScore)}`}>
            {healthScore}
          </span>
        )}
      </div>
      {summary && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">{summary}</p>
      )}
    </div>
  );
}

export default AIInsightPanel;
