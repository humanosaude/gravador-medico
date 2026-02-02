'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Zap, AlertTriangle, TrendingUp, TrendingDown, Target, 
  DollarSign, Eye, MousePointerClick, RefreshCw, Send, Sparkles,
  ChevronDown, ChevronUp, Award, XCircle, CheckCircle, Clock,
  Lightbulb, Rocket, Shield, BarChart3, PieChart, Activity,
  MessageSquare, Bot, User, Copy, Check, Loader2, AlertCircle, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TIPOS
// =====================================================

interface AIAnalysis {
  timestamp: string;
  statusConta: 'SAUDÁVEL' | 'ATENÇÃO' | 'CRÍTICO';
  resumoExecutivo: {
    veredito: string;
    eficienciaGasto: number;
    maiorVitoria: string;
    maiorAmeaca: string;
  };
  acoesImediatas: Array<{
    prioridade: number;
    acao: string;
    motivo: string;
    impactoEsperado: string;
    urgencia: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
  }>;
  rankingCriativos: {
    vencedores: Array<{
      nomeAnuncio: string;
      metricasChave: { ctr: number; cpa: number; roas: number; gasto: number; vendas: number };
      porQueFunciona: string;
      recomendacaoEscala: string;
    }>;
    perdedores: Array<{
      nomeAnuncio: string;
      metricasChave: { ctr: number; cpa: number; roas: number; gasto: number; vendas: number };
      porQueFalha: string;
      acao: string;
    }>;
  };
  insightsPublicos: {
    melhoresSegmentos: string[];
    segmentosSaturados: string[];
    oportunidadesInexploradas: string[];
  };
  alertas: Array<{
    severidade: 'CRÍTICO' | 'ATENÇÃO' | 'INFO';
    mensagem: string;
    campanhasAfetadas: string[];
    perdaEstimada: number;
  }>;
  laboratorioTestes: {
    proximoTeste: {
      nome: string;
      hipotese: string;
      setup: string;
      orcamento: number;
      duracao: string;
      criterioSucesso: string;
    };
  };
  metricas: {
    gastoTotal: number;
    receitaTotal: number;
    roasGeral: number;
    cpaGeral: number;
    ctrMedio: number;
    totalVendas: number;
  };
  warning?: string;
  cached?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// =====================================================
// COMPONENTES
// =====================================================

const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: '7 dias' },
  { value: 'last_14d', label: '14 dias' },
  { value: 'last_30d', label: '30 dias' },
];

function StatusBadge({ status }: { status: AIAnalysis['statusConta'] }) {
  const config = {
    'SAUDÁVEL': { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
    'ATENÇÃO': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
    'CRÍTICO': { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle }
  };
  
  const { bg, text, icon: Icon } = config[status];
  
  return (
    <span className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold', bg, text)}>
      <Icon className="h-5 w-5" />
      {status}
    </span>
  );
}

function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  color,
  trend
}: { 
  icon: any; 
  label: string; 
  value: string; 
  subValue?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className={cn('p-4 rounded-xl border', color)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" />
        <span className="text-sm opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          trend === 'up' ? <TrendingUp className="h-4 w-4 text-green-400" /> :
          trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-400" /> : null
        )}
      </div>
      {subValue && <p className="text-xs opacity-60 mt-1">{subValue}</p>}
    </div>
  );
}

function ActionCard({ action, index }: { action: AIAnalysis['acoesImediatas'][0]; index: number }) {
  const [expanded, setExpanded] = useState(action.urgencia === 'CRÍTICO');
  
  const urgencyConfig = {
    'CRÍTICO': { bg: 'border-red-500/30 bg-red-500/10', badge: 'bg-red-500/20 text-red-400' },
    'ALTO': { bg: 'border-orange-500/30 bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-400' },
    'MÉDIO': { bg: 'border-yellow-500/30 bg-yellow-500/10', badge: 'bg-yellow-500/20 text-yellow-400' },
    'BAIXO': { bg: 'border-gray-500/30 bg-gray-500/10', badge: 'bg-gray-500/20 text-gray-400' }
  };
  
  const config = urgencyConfig[action.urgencia];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn('rounded-xl border p-4 cursor-pointer transition-all', config.bg)}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-brand-400">{action.prioridade}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-white">{action.acao}</p>
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', config.badge)}>
              {action.urgencia}
            </span>
          </div>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-2 text-sm"
              >
                <p className="text-gray-400"><strong>Por que:</strong> {action.motivo}</p>
                <p className="text-green-400"><strong>Impacto:</strong> {action.impactoEsperado}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </div>
    </motion.div>
  );
}

function CreativeCard({ creative, type }: { creative: any; type: 'winner' | 'loser' }) {
  const isWinner = type === 'winner';
  
  return (
    <div className={cn(
      'p-4 rounded-xl border',
      isWinner ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
    )}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {isWinner ? (
            <Award className="h-5 w-5 text-green-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400" />
          )}
          <span className="font-medium text-white truncate">{creative.nomeAnuncio}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="p-2 rounded bg-white/5">
          <span className="text-gray-500">CTR</span>
          <p className="text-white font-medium">{creative.metricasChave.ctr.toFixed(2)}%</p>
        </div>
        <div className="p-2 rounded bg-white/5">
          <span className="text-gray-500">CPA</span>
          <p className="text-white font-medium">R$ {creative.metricasChave.cpa.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded bg-white/5">
          <span className="text-gray-500">Vendas</span>
          <p className="text-white font-medium">{creative.metricasChave.vendas}</p>
        </div>
      </div>
      
      <p className="text-xs text-gray-400">
        {isWinner ? creative.porQueFunciona : creative.porQueFalha}
      </p>
      
      <div className="mt-2 p-2 rounded bg-white/5">
        <p className="text-xs text-brand-300">
          {isWinner ? creative.recomendacaoEscala : creative.acao}
        </p>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: AIAnalysis['alertas'][0] }) {
  const config = {
    'CRÍTICO': { bg: 'border-red-500/30 bg-red-500/10', icon: XCircle, iconColor: 'text-red-400' },
    'ATENÇÃO': { bg: 'border-yellow-500/30 bg-yellow-500/10', icon: AlertTriangle, iconColor: 'text-yellow-400' },
    'INFO': { bg: 'border-blue-500/30 bg-blue-500/10', icon: Lightbulb, iconColor: 'text-blue-400' }
  };
  
  const { bg, icon: Icon, iconColor } = config[alert.severidade];
  
  return (
    <div className={cn('p-4 rounded-xl border', bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} />
        <div>
          <p className="text-white">{alert.mensagem}</p>
          {alert.perdaEstimada > 0 && (
            <p className="text-xs text-red-400 mt-1">
              Perda estimada: R$ {alert.perdaEstimada.toFixed(2)}/período
            </p>
          )}
          {alert.campanhasAfetadas.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Campanhas: {alert.campanhasAfetadas.slice(0, 3).join(', ')}
              {alert.campanhasAfetadas.length > 3 && ` +${alert.campanhasAfetadas.length - 3}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatInterface({ period }: { period: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/ai/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          period,
          includeContext: true
        })
      });
      
      const data = await res.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.error || 'Erro ao processar resposta',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erro ao conectar com a IA. Tente novamente.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const quickQuestions = [
    'Qual criativo devo escalar primeiro?',
    'Como reduzir meu CPA?',
    'Quais campanhas devo pausar?',
    'Como melhorar meu CTR?',
    'Qual público está saturado?'
  ];
  
  return (
    <div className="flex flex-col h-[500px] rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Bot className="h-5 w-5 text-brand-400" />
        <span className="font-medium text-white">Chat com IA</span>
        <span className="text-xs text-gray-500 ml-auto">Contexto: últimos {period}</span>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-brand-400/50 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Pergunte qualquer coisa sobre seus ads!</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-brand-400" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] p-3 rounded-xl relative group',
              msg.role === 'user' 
                ? 'bg-brand-500/20 border border-brand-500/30' 
                : 'bg-white/5 border border-white/10'
            )}>
              <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
              <button
                onClick={() => copyMessage(msg.content, msg.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === msg.id ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                )}
              </button>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-brand-400" />
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <Loader2 className="h-5 w-5 text-brand-400 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Pergunte sobre seus ads..."
            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500/50"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function AIPerformancePage() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'creatives' | 'chat'>('overview');
  
  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/performance?period=${period}&type=local${forceRefresh ? '&refresh=true' : ''}`);
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Erro ao carregar análise:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);
  
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);
  
  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-brand-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white font-medium">Analisando dados com IA...</p>
          <p className="text-gray-400 text-sm mt-2">Isso pode levar alguns segundos</p>
        </div>
      </div>
    );
  }
  
  if (!analysis) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium">Erro ao carregar análise</p>
          <button
            onClick={() => fetchAnalysis(true)}
            className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Performance Intelligence</h1>
            <p className="text-gray-400">Motor de IA para análise de tráfego pago</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <a
            href="/admin/ai/rules"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
          >
            <Bell className="h-4 w-4" />
            Alertas
          </a>
          <a
            href="/admin/ai/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
          >
            <Shield className="h-4 w-4" />
            Configurações
          </a>
          <a
            href="/admin/ai/escala-automatica"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg"
          >
            <Rocket className="h-4 w-4" />
            Escala Automática
          </a>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => fetchAnalysis(true)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
          </button>
        </div>
      </motion.div>
      
      {/* Status e Resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <StatusBadge status={analysis.statusConta} />
            {analysis.cached && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Cache
              </span>
            )}
          </div>
          
          <p className="text-lg text-white mb-4">{analysis.resumoExecutivo.veredito}</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Maior Vitória</span>
              </div>
              <p className="text-white font-medium">{analysis.resumoExecutivo.maiorVitoria}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Maior Ameaça</span>
              </div>
              <p className="text-white font-medium">{analysis.resumoExecutivo.maiorAmeaca}</p>
            </div>
          </div>
        </motion.div>
        
        {/* Eficiência */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-600/20 border border-brand-500/30"
        >
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  strokeWidth="12"
                  fill="none"
                  className="stroke-white/10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  strokeWidth="12"
                  fill="none"
                  className="stroke-brand-500"
                  strokeDasharray={`${(analysis.resumoExecutivo.eficienciaGasto / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {analysis.resumoExecutivo.eficienciaGasto}%
                </span>
              </div>
            </div>
            <p className="text-brand-300 font-medium">Eficiência do Gasto</p>
            <p className="text-xs text-gray-500 mt-1">% do orçamento em ROAS &gt; 3.0x</p>
          </div>
        </motion.div>
      </div>
      
      {/* Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Gasto Total"
          value={`R$ ${analysis.metricas.gastoTotal.toFixed(2)}`}
          color="bg-green-500/10 border-green-500/20 text-green-400"
        />
        <MetricCard
          icon={DollarSign}
          label="Receita"
          value={`R$ ${analysis.metricas.receitaTotal.toFixed(2)}`}
          color="bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
        />
        <MetricCard
          icon={TrendingUp}
          label="ROAS"
          value={`${analysis.metricas.roasGeral.toFixed(2)}x`}
          subValue={analysis.metricas.roasGeral >= 3.5 ? 'Escalar!' : analysis.metricas.roasGeral < 2 ? 'Crítico' : 'Ok'}
          color={analysis.metricas.roasGeral >= 2.5 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}
        />
        <MetricCard
          icon={Target}
          label="CPA"
          value={`R$ ${analysis.metricas.cpaGeral.toFixed(2)}`}
          subValue={analysis.metricas.cpaGeral < 12 ? 'Ideal!' : analysis.metricas.cpaGeral > 18 ? 'Alto' : 'Ok'}
          color={analysis.metricas.cpaGeral <= 18 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}
        />
        <MetricCard
          icon={MousePointerClick}
          label="CTR Médio"
          value={`${analysis.metricas.ctrMedio.toFixed(2)}%`}
          subValue={analysis.metricas.ctrMedio > 2.5 ? 'Excelente!' : analysis.metricas.ctrMedio < 1.2 ? 'Baixo' : 'Bom'}
          color="bg-purple-500/10 border-purple-500/20 text-purple-400"
        />
        <MetricCard
          icon={Award}
          label="Vendas"
          value={analysis.metricas.totalVendas.toString()}
          color="bg-orange-500/10 border-orange-500/20 text-orange-400"
        />
      </div>
      
      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: '📊 Visão Geral', icon: BarChart3 },
            { id: 'actions', label: '⚡ Ações', icon: Zap, count: analysis.acoesImediatas.length },
            { id: 'creatives', label: '🎨 Criativos', icon: PieChart },
            { id: 'chat', label: '💬 Chat IA', icon: MessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
              {tab.count && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Alertas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Alertas ({analysis.alertas.length})
              </h3>
              {analysis.alertas.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhum alerta no momento 🎉</p>
              ) : (
                analysis.alertas.map((alert, i) => (
                  <AlertCard key={i} alert={alert} />
                ))
              )}
            </div>
            
            {/* Insights de Público */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-brand-400" />
                Insights de Público
              </h3>
              
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-green-400 font-medium mb-2">🐋 Melhores Segmentos</p>
                  {analysis.insightsPublicos.melhoresSegmentos.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nenhum identificado</p>
                  ) : (
                    <ul className="space-y-1">
                      {analysis.insightsPublicos.melhoresSegmentos.map((s, i) => (
                        <li key={i} className="text-sm text-white">• {s}</li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-400 font-medium mb-2">⚠️ Saturados</p>
                  {analysis.insightsPublicos.segmentosSaturados.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nenhum saturado</p>
                  ) : (
                    <ul className="space-y-1">
                      {analysis.insightsPublicos.segmentosSaturados.map((s, i) => (
                        <li key={i} className="text-sm text-white">• {s}</li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-blue-400 font-medium mb-2">💡 Oportunidades</p>
                  <ul className="space-y-1">
                    {analysis.insightsPublicos.oportunidadesInexploradas.map((s, i) => (
                      <li key={i} className="text-sm text-white">• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Próximo Teste */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Rocket className="h-5 w-5 text-purple-400" />
                Laboratório de Testes
              </h3>
              
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-lg font-medium text-white">{analysis.laboratorioTestes.proximoTeste.nome}</p>
                    <p className="text-gray-400">{analysis.laboratorioTestes.proximoTeste.hipotese}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-purple-400 font-medium">R$ {analysis.laboratorioTestes.proximoTeste.orcamento}</p>
                    <p className="text-xs text-gray-500">{analysis.laboratorioTestes.proximoTeste.duracao}</p>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-white/5 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Setup:</p>
                  <p className="text-sm text-white">{analysis.laboratorioTestes.proximoTeste.setup}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-gray-400">Critério de sucesso:</span>
                  <span className="text-green-400">{analysis.laboratorioTestes.proximoTeste.criterioSucesso}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {activeTab === 'actions' && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Ações Imediatas ({analysis.acoesImediatas.length})
            </h3>
            
            {analysis.acoesImediatas.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhuma ação pendente</p>
            ) : (
              <div className="space-y-3">
                {analysis.acoesImediatas.map((action, i) => (
                  <ActionCard key={i} action={action} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}
        
        {activeTab === 'creatives' && (
          <motion.div
            key="creatives"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Vencedores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-green-400" />
                Criativos Vencedores ({analysis.rankingCriativos.vencedores.length})
              </h3>
              {analysis.rankingCriativos.vencedores.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhum criativo vencedor identificado</p>
              ) : (
                analysis.rankingCriativos.vencedores.map((c, i) => (
                  <CreativeCard key={i} creative={c} type="winner" />
                ))
              )}
            </div>
            
            {/* Perdedores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" />
                Criativos para Pausar ({analysis.rankingCriativos.perdedores.length})
              </h3>
              {analysis.rankingCriativos.perdedores.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhum criativo para pausar</p>
              ) : (
                analysis.rankingCriativos.perdedores.map((c, i) => (
                  <CreativeCard key={i} creative={c} type="loser" />
                ))
              )}
            </div>
          </motion.div>
        )}
        
        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ChatInterface period={period} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Warning */}
      {analysis.warning && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {analysis.warning}
          </p>
        </div>
      )}
    </div>
  );
}
