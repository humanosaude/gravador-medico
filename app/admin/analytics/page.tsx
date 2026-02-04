'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, Users, Eye, MousePointerClick, Globe,
  FileText, Share2, RefreshCw, TrendingUp, ArrowDownRight, 
  BarChart3, Zap, Timer, MapPin, Smartphone, Monitor, Tablet, Chrome,
  Brain, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIInsightPanel } from '@/components/ai/AIInsightPanel';

interface TrafficData { date: string; usuarios: number; visualizacoes: number; }
interface RealtimeData { activeUsers: number; pages: { page: string; users: number }[]; }
interface TopPage { page: string; title: string; views: number; }
interface Country { country: string; users: number; flag?: string; }
interface TrafficSource { source: string; users: number; sessions: number; }
interface KPIData { totalUsers: number; totalViews: number; totalEvents: number; totalSessions: number; }
interface CityData { city: string; users: number; }
interface AgeData { age: string; users: number; }
interface DeviceData { device: string; users: number; }
interface BrowserData { browser: string; users: number; }

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

const countryFlags: Record<string, string> = {
  'Brazil': '\u{1F1E7}\u{1F1F7}', 'United States': '\u{1F1FA}\u{1F1F8}', 'Portugal': '\u{1F1F5}\u{1F1F9}',
  'Argentina': '\u{1F1E6}\u{1F1F7}', 'Mexico': '\u{1F1F2}\u{1F1FD}', 'Spain': '\u{1F1EA}\u{1F1F8}',
  'Germany': '\u{1F1E9}\u{1F1EA}', 'France': '\u{1F1EB}\u{1F1F7}', 'United Kingdom': '\u{1F1EC}\u{1F1E7}',
};

const GlassCard = ({ children, className = '', gradient = false }: { children: React.ReactNode; className?: string; gradient?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20 hover:shadow-purple-500/10 hover:border-purple-500/20 transition-all duration-500 ${gradient ? 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-500/10 before:to-transparent before:pointer-events-none' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

const AnimatedNumber = ({ value }: { value: number }) => (
  <AnimatePresence mode="wait">
    <motion.span key={value} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="tabular-nums">
      {value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value}
    </motion.span>
  </AnimatePresence>
);

// Opções de período
const periodOptions = [
  { value: 'today', label: 'Hoje', days: 0 },
  { value: 'yesterday', label: 'Ontem', days: 1 },
  { value: '7d', label: '7 dias', days: 7 },
  { value: '14d', label: '14 dias', days: 14 },
  { value: '30d', label: '30 dias', days: 30 },
  { value: '90d', label: '90 dias', days: 90 },
];

// Helper para calcular datas do período
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  const option = periodOptions.find(p => p.value === period);
  const days = option?.days ?? 7;
  
  if (period === 'today') {
    // Hoje
  } else if (period === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else {
    start.setDate(start.getDate() - (days - 1));
  }
  
  return { start, end };
}

export default function AnalyticsPage() {
  const [traffic, setTraffic] = useState<TrafficData[]>([]);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [kpis, setKPIs] = useState<KPIData | null>(null);
  const [cities, setCities] = useState<CityData[]>([]);
  const [ages, setAges] = useState<AgeData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [browsers, setBrowsers] = useState<BrowserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  
  // Estados da IA
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Função para buscar análise da IA
  const fetchAIAnalysis = useCallback(async (analyticsData: {
    kpis: KPIData;
    traffic: TrafficData[];
    sources: TrafficSource[];
    topPages: TopPage[];
    devices: DeviceData[];
    countries: Country[];
    cities: CityData[];
    realtime: RealtimeData | null;
  }) => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const periodLabel = periodOptions.find(p => p.value === selectedPeriod)?.label || '7 dias';
      
      const response = await fetch('/api/ai/analytics-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: analyticsData,
          period: periodLabel
        })
      });
      
      if (!response.ok) throw new Error('Erro ao buscar análise');
      
      const data = await response.json();
      setAiAnalysis(data);
    } catch (error) {
      console.error('Erro na análise IA:', error);
      setAiError('Não foi possível gerar análise. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  }, [selectedPeriod]);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { start, end } = getDateRange(selectedPeriod);
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      const params = `start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`;
      
      const [trafficRes, realtimeRes, pagesRes, countriesRes, sourcesRes, kpisRes, citiesRes, agesRes, devicesRes, browsersRes] = await Promise.all([
        fetch(`/api/analytics/traffic?${params}`), 
        fetch('/api/analytics/realtime'), 
        fetch(`/api/analytics/top-pages?${params}`),
        fetch(`/api/analytics/countries?${params}`), 
        fetch(`/api/analytics/sources?${params}`), 
        fetch(`/api/analytics/kpis?${params}`),
        fetch(`/api/analytics/cities?${params}`), 
        fetch(`/api/analytics/age?${params}`), 
        fetch(`/api/analytics/devices?${params}`), 
        fetch(`/api/analytics/browsers?${params}`),
      ]);
      const [trafficData, realtimeData, pagesData, countriesData, sourcesData, kpisData, citiesData, agesData, devicesData, browsersData] = await Promise.all([
        trafficRes.json(), realtimeRes.json(), pagesRes.json(), countriesRes.json(), sourcesRes.json(), kpisRes.json(),
        citiesRes.json(), agesRes.json(), devicesRes.json(), browsersRes.json(),
      ]);
      setTraffic(Array.isArray(trafficData) ? trafficData : []);
      setRealtime(realtimeData);
      setTopPages(Array.isArray(pagesData) ? pagesData : []);
      setCountries((Array.isArray(countriesData) ? countriesData : []).map((c: Country) => ({ ...c, flag: countryFlags[c.country] || '\u{1F30D}' })));
      setSources(Array.isArray(sourcesData) ? sourcesData : []);
      setKPIs(kpisData);
      setCities(Array.isArray(citiesData) ? citiesData : []);
      setAges(Array.isArray(agesData) ? agesData : []);
      setDevices(Array.isArray(devicesData) ? devicesData : []);
      setBrowsers(Array.isArray(browsersData) ? browsersData : []);
      setLastUpdate(new Date());
      
      // Buscar análise da IA após carregar todos os dados
      if (kpisData && kpisData.totalUsers > 0) {
        fetchAIAnalysis({
          kpis: kpisData,
          traffic: Array.isArray(trafficData) ? trafficData : [],
          sources: Array.isArray(sourcesData) ? sourcesData : [],
          topPages: Array.isArray(pagesData) ? pagesData : [],
          devices: Array.isArray(devicesData) ? devicesData : [],
          countries: Array.isArray(countriesData) ? countriesData : [],
          cities: Array.isArray(citiesData) ? citiesData : [],
          realtime: realtimeData
        });
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(() => fetchData(), 60000); 
    return () => clearInterval(interval); 
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-2xl" /><Skeleton className="h-8 w-64" /></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  const avgSessionDuration = kpis ? Math.round((kpis.totalSessions / kpis.totalUsers) * 100) / 100 : 0;
  const bounceRate = kpis ? Math.round((1 - kpis.totalSessions / kpis.totalViews) * 100) : 0;
  const pagesPerSession = kpis && kpis.totalSessions > 0 ? (kpis.totalViews / kpis.totalSessions).toFixed(1) : '0';
  const engagement = kpis && kpis.totalUsers > 0 ? (kpis.totalEvents / kpis.totalUsers).toFixed(1) : '0';
  const maxPageViews = topPages.length > 0 ? Math.max(...topPages.map(p => p.views)) : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 via-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 transform hover:scale-105 transition-transform">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Google Analytics 4 - {periodOptions.find(p => p.value === selectedPeriod)?.label}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Período */}
            <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl border border-gray-700/50">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedPeriod(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === option.value
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fetchData(true)} disabled={refreshing}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </motion.button>
          </div>
        </motion.div>

        {/* Painel de Análise IA */}
        <AIInsightPanel
          type="analytics"
          loading={aiLoading}
          error={aiError || undefined}
          summary={aiAnalysis?.summary}
          healthScore={aiAnalysis?.healthScore}
          insights={aiAnalysis?.insights}
          recommendations={aiAnalysis?.recommendations}
          trends={aiAnalysis?.trends}
          generatedAt={aiAnalysis?.generatedAt}
          onRefresh={() => {
            if (kpis) {
              fetchAIAnalysis({
                kpis,
                traffic,
                sources,
                topPages,
                devices,
                countries,
                cities,
                realtime
              });
            }
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <GlassCard className="lg:col-span-1" gradient>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tempo Real</span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-green-500" /></span>
                  <span className="text-[10px] font-bold text-green-400 uppercase">Live</span>
                </span>
              </div>
              <div className="text-5xl font-black text-white"><AnimatedNumber value={realtime?.activeUsers || 0} /></div>
              <p className="text-sm text-gray-400 mt-2">usuarios ativos agora</p>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Usuarios</span>
              </div>
              <div className="text-3xl font-bold text-white"><AnimatedNumber value={kpis?.totalUsers || 0} /></div>
              <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm"><TrendingUp className="w-4 h-4" /><span className="font-medium">+12.5%</span></div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Eye className="w-5 h-5 text-white" /></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visualizacoes</span>
              </div>
              <div className="text-3xl font-bold text-white"><AnimatedNumber value={kpis?.totalViews || 0} /></div>
              <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm"><TrendingUp className="w-4 h-4" /><span className="font-medium">+8.3%</span></div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center"><MousePointerClick className="w-5 h-5 text-white" /></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Eventos</span>
              </div>
              <div className="text-3xl font-bold text-white"><AnimatedNumber value={kpis?.totalEvents || 0} /></div>
              <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm"><TrendingUp className="w-4 h-4" /><span className="font-medium">+15.2%</span></div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sessoes</span>
              </div>
              <div className="text-3xl font-bold text-white"><AnimatedNumber value={kpis?.totalSessions || 0} /></div>
              <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm"><TrendingUp className="w-4 h-4" /><span className="font-medium">+10.1%</span></div>
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>
                <div><h3 className="text-lg font-bold text-white">Trafego dos Ultimos 7 Dias</h3><p className="text-xs text-gray-500">Usuarios e Visualizacoes</p></div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-gray-400">Usuarios</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-400">Visualizacoes</span></div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="usuarios" stroke="#6366f1" strokeWidth={2} fill="url(#colorUsers)" name="Usuarios" />
                  <Area type="monotone" dataKey="visualizacoes" stroke="#10b981" strokeWidth={2} fill="url(#colorViews)" name="Visualizacoes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
                <h3 className="text-lg font-bold text-white">Paginas Mais Visitadas</h3>
              </div>
              <div className="space-y-4">
                {topPages.slice(0, 5).map((page, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-300 truncate max-w-[200px]">{page.title || page.page}</span><span className="text-white font-bold">{page.views >= 1000 ? (page.views/1000).toFixed(1)+'K' : page.views}</span></div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: (page.views / maxPageViews) * 100 + '%' }} transition={{ duration: 1, delay: i * 0.1 }} className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" /></div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"><Globe className="w-5 h-5 text-white" /></div>
                <h3 className="text-lg font-bold text-white">Paises</h3>
              </div>
              <div className="space-y-3">
                {countries.slice(0, 6).map((country, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3"><span className="text-2xl">{country.flag}</span><span className="text-gray-300">{country.country}</span></div>
                    <span className="text-white font-bold">{country.users >= 1000 ? (country.users/1000).toFixed(1)+'K' : country.users}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center"><Share2 className="w-5 h-5 text-white" /></div>
                <h3 className="text-lg font-bold text-white">Fontes de Trafego</h3>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={sources} dataKey="users" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>{sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {sources.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-gray-400">{s.source}</span></div>
                    <span className="text-white font-medium">{s.users >= 1000 ? (s.users/1000).toFixed(1)+'K' : s.users}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard><div className="p-5"><div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Sessoes/Usuario</span></div><div className="text-2xl font-bold text-white">{avgSessionDuration}</div></div></GlassCard>
          <GlassCard><div className="p-5"><div className="flex items-center gap-2 mb-2"><ArrowDownRight className="w-4 h-4 text-rose-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Taxa de Rejeicao</span></div><div className="text-2xl font-bold text-white">{bounceRate}%</div></div></GlassCard>
          <GlassCard><div className="p-5"><div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-purple-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Paginas/Sessao</span></div><div className="text-2xl font-bold text-white">{pagesPerSession}</div></div></GlassCard>
          <GlassCard><div className="p-5"><div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-amber-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Engajamento</span></div><div className="text-2xl font-bold text-white">{engagement}</div></div></GlassCard>
        </div>

        {/* Dados Demográficos */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Cidades */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"><MapPin className="w-5 h-5 text-white" /></div>
                <h3 className="text-lg font-bold text-white">Cidades</h3>
              </div>
              <div className="space-y-2">
                {cities.slice(0, 6).map((city, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                    <span className="text-gray-300 truncate max-w-[120px]">{city.city}</span>
                    <span className="text-white font-bold">{city.users}</span>
                  </div>
                ))}
                {cities.length === 0 && <p className="text-gray-500 text-sm">Dados insuficientes</p>}
              </div>
            </div>
          </GlassCard>

          {/* Dispositivos */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><Smartphone className="w-5 h-5 text-white" /></div>
                <h3 className="text-lg font-bold text-white">Dispositivos</h3>
              </div>
              <div className="space-y-3">
                {devices.map((device, i) => {
                  const Icon = device.device === 'mobile' ? Smartphone : device.device === 'tablet' ? Tablet : Monitor;
                  const totalDevices = devices.reduce((sum, d) => sum + d.users, 0);
                  const percentage = totalDevices > 0 ? Math.round((device.users / totalDevices) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-sky-400" /><span className="text-gray-300 capitalize">{device.device}</span></div>
                        <span className="text-white font-bold">{percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: percentage + '%' }} transition={{ duration: 1, delay: i * 0.2 }} className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full" />
                      </div>
                    </div>
                  );
                })}
                {devices.length === 0 && <p className="text-gray-500 text-sm">Dados insuficientes</p>}
              </div>
            </div>
          </GlassCard>

          {/* Faixa Etaria */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
                <h3 className="text-lg font-bold text-white">Faixa Etaria</h3>
              </div>
              <div className="space-y-2">
                {ages.map((age, i) => {
                  const totalAges = ages.reduce((sum, a) => sum + a.users, 0);
                  const percentage = totalAges > 0 ? Math.round((age.users / totalAges) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-800/30">
                      <span className="text-gray-300">{age.age}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full" style={{ width: percentage + '%' }} />
                        </div>
                        <span className="text-white font-bold w-10 text-right">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
                {ages.length === 0 && <p className="text-gray-500 text-sm">Ative sinais do Google para ver dados demograficos</p>}
              </div>
            </div>
          </GlassCard>

          {/* Navegadores */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"><Chrome className="w-5 h-5 text-white" /></div>
                <h3 className="text-lg font-bold text-white">Navegadores</h3>
              </div>
              <div className="space-y-2">
                {browsers.slice(0, 5).map((browser, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                    <span className="text-gray-300">{browser.browser}</span>
                    <span className="text-white font-bold">{browser.users}</span>
                  </div>
                ))}
                {browsers.length === 0 && <p className="text-gray-500 text-sm">Dados insuficientes</p>}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
