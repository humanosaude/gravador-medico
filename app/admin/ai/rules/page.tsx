'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Target, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, Bell, Shield, Save, Plus, Trash2, Edit2,
  Check, X, Loader2, Info, ChevronDown, ChevronUp, Zap,
  AlertCircle, Activity, ArrowLeft, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// =====================================================
// TIPOS
// =====================================================

interface AlertRule {
  id: string;
  user_id: string;
  rule_name: string;
  rule_type: 'sangria' | 'cpa_alto' | 'roas_baixo' | 'escala' | 'custom';
  metric: 'cpa' | 'roas' | 'spend' | 'ctr' | 'cpc' | 'purchases';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  action_type: 'pause' | 'alert' | 'scale' | 'notify';
  priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  apply_to_campaigns: string[] | null;
  created_at: string;
  updated_at: string;
}

interface DefaultRule {
  name: string;
  type: AlertRule['rule_type'];
  metric: AlertRule['metric'];
  operator: AlertRule['operator'];
  defaultThreshold: number;
  action: AlertRule['action_type'];
  priority: AlertRule['priority'];
  description: string;
  icon: React.ReactNode;
  color: string;
}

// =====================================================
// REGRAS PADRÃO
// =====================================================

const defaultRules: DefaultRule[] = [
  {
    name: 'Detector de Sangria',
    type: 'sangria',
    metric: 'spend',
    operator: 'gt',
    defaultThreshold: 50,
    action: 'pause',
    priority: 'high',
    description: 'Alerta quando gastou mais de R$ X sem nenhuma venda',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'red'
  },
  {
    name: 'CPA Teto',
    type: 'cpa_alto',
    metric: 'cpa',
    operator: 'gt',
    defaultThreshold: 150,
    action: 'alert',
    priority: 'high',
    description: 'Alerta quando CPA ultrapassa seu limite máximo',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'orange'
  },
  {
    name: 'ROAS Mínimo',
    type: 'roas_baixo',
    metric: 'roas',
    operator: 'lt',
    defaultThreshold: 2.0,
    action: 'alert',
    priority: 'medium',
    description: 'Alerta quando ROAS está abaixo do mínimo aceitável',
    icon: <TrendingDown className="w-5 h-5" />,
    color: 'yellow'
  },
  {
    name: 'Oportunidade de Escala',
    type: 'escala',
    metric: 'roas',
    operator: 'gte',
    defaultThreshold: 3.0,
    action: 'scale',
    priority: 'low',
    description: 'Identifica campanhas com ROAS excelente para escalar',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'green'
  }
];

// =====================================================
// COMPONENTES
// =====================================================

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
  isLoading
}: {
  rule: AlertRule;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (rule: AlertRule) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  const getColorClasses = (type: string) => {
    switch (type) {
      case 'sangria': return 'border-red-500/30 bg-red-500/5';
      case 'cpa_alto': return 'border-orange-500/30 bg-orange-500/5';
      case 'roas_baixo': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'escala': return 'border-green-500/30 bg-green-500/5';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'sangria': return 'text-red-400';
      case 'cpa_alto': return 'text-orange-400';
      case 'roas_baixo': return 'text-yellow-400';
      case 'escala': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sangria': return <AlertTriangle className="w-5 h-5" />;
      case 'cpa_alto': return <DollarSign className="w-5 h-5" />;
      case 'roas_baixo': return <TrendingDown className="w-5 h-5" />;
      case 'escala': return <TrendingUp className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const getOperatorLabel = (op: string) => {
    switch (op) {
      case 'gt': return '>';
      case 'lt': return '<';
      case 'gte': return '≥';
      case 'lte': return '≤';
      case 'eq': return '=';
      default: return op;
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'cpa': return 'CPA';
      case 'roas': return 'ROAS';
      case 'spend': return 'Gasto';
      case 'ctr': return 'CTR';
      case 'cpc': return 'CPC';
      case 'purchases': return 'Vendas';
      default: return metric;
    }
  };

  const formatThreshold = (metric: string, value: number) => {
    if (metric === 'cpa' || metric === 'spend' || metric === 'cpc') {
      return `R$ ${value.toFixed(2)}`;
    }
    if (metric === 'roas') {
      return `${value.toFixed(1)}x`;
    }
    if (metric === 'ctr') {
      return `${value.toFixed(2)}%`;
    }
    return value.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-xl border p-5 transition-all",
        getColorClasses(rule.rule_type),
        !rule.is_active && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-2.5 rounded-lg bg-gray-800/50",
            getIconColor(rule.rule_type)
          )}>
            {getIcon(rule.rule_type)}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-100">{rule.rule_name}</h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
              <span>{getMetricLabel(rule.metric)}</span>
              <span className="text-gray-600">{getOperatorLabel(rule.operator)}</span>
              <span className="font-medium text-gray-200">
                {formatThreshold(rule.metric, rule.threshold)}
              </span>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                rule.priority === 'high' && "bg-red-500/20 text-red-400",
                rule.priority === 'medium' && "bg-yellow-500/20 text-yellow-400",
                rule.priority === 'low' && "bg-green-500/20 text-green-400"
              )}>
                {rule.priority === 'high' ? 'Alta' : rule.priority === 'medium' ? 'Média' : 'Baixa'}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-400">
                {rule.action_type === 'pause' ? 'Pausar' :
                 rule.action_type === 'alert' ? 'Alertar' :
                 rule.action_type === 'scale' ? 'Escalar' : 'Notificar'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle */}
          <button
            onClick={() => onToggle(rule.id, !rule.is_active)}
            disabled={isLoading}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors",
              rule.is_active ? "bg-green-500" : "bg-gray-600"
            )}
          >
            <motion.div
              animate={{ x: rule.is_active ? 24 : 2 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full"
            />
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(rule)}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function RuleEditor({
  rule,
  onSave,
  onCancel,
  isLoading
}: {
  rule?: AlertRule | null;
  onSave: (data: Partial<AlertRule>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    rule_name: rule?.rule_name || '',
    rule_type: rule?.rule_type || 'custom' as AlertRule['rule_type'],
    metric: rule?.metric || 'cpa' as AlertRule['metric'],
    operator: rule?.operator || 'gt' as AlertRule['operator'],
    threshold: rule?.threshold || 0,
    action_type: rule?.action_type || 'alert' as AlertRule['action_type'],
    priority: rule?.priority || 'medium' as AlertRule['priority'],
    is_active: rule?.is_active ?? true
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">
          {rule ? 'Editar Regra' : 'Nova Regra'}
        </h2>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Nome da Regra
            </label>
            <input
              type="text"
              value={form.rule_name}
              onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
              placeholder="Ex: CPA Máximo Permitido"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Tipo de Regra
            </label>
            <select
              value={form.rule_type}
              onChange={(e) => setForm({ ...form, rule_type: e.target.value as AlertRule['rule_type'] })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="sangria">Detector de Sangria</option>
              <option value="cpa_alto">CPA Alto</option>
              <option value="roas_baixo">ROAS Baixo</option>
              <option value="escala">Oportunidade de Escala</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Métrica e Operador */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Métrica
              </label>
              <select
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value as AlertRule['metric'] })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cpa">CPA</option>
                <option value="roas">ROAS</option>
                <option value="spend">Gasto</option>
                <option value="ctr">CTR</option>
                <option value="cpc">CPC</option>
                <option value="purchases">Vendas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Condição
              </label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value as AlertRule['operator'] })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="gt">Maior que (&gt;)</option>
                <option value="gte">Maior ou igual (≥)</option>
                <option value="lt">Menor que (&lt;)</option>
                <option value="lte">Menor ou igual (≤)</option>
                <option value="eq">Igual (=)</option>
              </select>
            </div>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Valor Limite
            </label>
            <div className="relative">
              {(form.metric === 'cpa' || form.metric === 'spend' || form.metric === 'cpc') && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
              )}
              <input
                type="number"
                step={form.metric === 'roas' ? '0.1' : '1'}
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: parseFloat(e.target.value) || 0 })}
                className={cn(
                  "w-full py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  (form.metric === 'cpa' || form.metric === 'spend' || form.metric === 'cpc') ? "pl-10 pr-4" : "px-4"
                )}
              />
              {form.metric === 'roas' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">x</span>
              )}
              {form.metric === 'ctr' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              )}
            </div>
          </div>

          {/* Ação e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Ação
              </label>
              <select
                value={form.action_type}
                onChange={(e) => setForm({ ...form, action_type: e.target.value as AlertRule['action_type'] })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pause">Pausar Campanha</option>
                <option value="alert">Apenas Alertar</option>
                <option value="scale">Sugerir Escala</option>
                <option value="notify">Notificar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Prioridade
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as AlertRule['priority'] })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="high">Alta (Urgente)</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-800/50 rounded-lg">
            <span className="text-sm text-gray-300">Regra Ativa</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                form.is_active ? "bg-green-500" : "bg-gray-600"
              )}
            >
              <motion.div
                animate={{ x: form.is_active ? 24 : 2 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full"
              />
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isLoading || !form.rule_name}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Regra
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QuickSetupCard({
  template,
  onSetup,
  isActive
}: {
  template: DefaultRule;
  onSetup: (template: DefaultRule, value: number) => void;
  isActive: boolean;
}) {
  const [value, setValue] = useState(template.defaultThreshold);
  const [isExpanded, setIsExpanded] = useState(false);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red': return 'border-red-500/30 hover:border-red-500/50 bg-red-500/5';
      case 'orange': return 'border-orange-500/30 hover:border-orange-500/50 bg-orange-500/5';
      case 'yellow': return 'border-yellow-500/30 hover:border-yellow-500/50 bg-yellow-500/5';
      case 'green': return 'border-green-500/30 hover:border-green-500/50 bg-green-500/5';
      default: return 'border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'red': return 'text-red-400';
      case 'orange': return 'text-orange-400';
      case 'yellow': return 'text-yellow-400';
      case 'green': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-5 transition-all cursor-pointer",
        getColorClasses(template.color),
        isActive && "ring-2 ring-green-500"
      )}
    >
      <div 
        className="flex items-start justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-2.5 rounded-lg bg-gray-800/50",
            getIconColor(template.color)
          )}>
            {template.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-100">{template.name}</h3>
              {isActive && (
                <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                  Ativo
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400">{template.description}</p>
          </div>
        </div>
        <button className="text-gray-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-700/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">
                  Valor Limite
                </label>
                <div className="relative">
                  {template.metric === 'spend' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                  )}
                  <input
                    type="number"
                    step={template.metric === 'roas' ? '0.1' : '1'}
                    value={value}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "w-full py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500",
                      template.metric === 'spend' ? "pl-10 pr-4" : "px-4"
                    )}
                  />
                  {template.metric === 'roas' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">x</span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetup(template, value);
                }}
                className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {isActive ? 'Atualizar' : 'Ativar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function RulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null | 'new'>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carregar regras
  const loadRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ads/alert-rules');
      if (!response.ok) throw new Error('Falha ao carregar regras');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError('Erro ao carregar regras. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Criar/atualizar regra
  const handleSaveRule = async (data: Partial<AlertRule>) => {
    try {
      setIsSaving(true);
      const isEdit = editingRule && editingRule !== 'new' && 'id' in editingRule;
      
      const response = await fetch('/api/ads/alert-rules', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingRule.id, ...data } : data)
      });

      if (!response.ok) throw new Error('Falha ao salvar regra');
      
      setSuccessMessage(isEdit ? 'Regra atualizada!' : 'Regra criada!');
      setEditingRule(null);
      loadRules();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Erro ao salvar regra. Tente novamente.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle regra
  const handleToggleRule = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/ads/alert-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: isActive })
      });

      if (!response.ok) throw new Error('Falha ao atualizar regra');
      
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive } : r));
    } catch (err) {
      setError('Erro ao atualizar regra.');
      console.error(err);
    }
  };

  // Deletar regra
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;
    
    try {
      const response = await fetch(`/api/ads/alert-rules?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Falha ao excluir regra');
      
      setRules(prev => prev.filter(r => r.id !== id));
      setSuccessMessage('Regra excluída!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Erro ao excluir regra.');
      console.error(err);
    }
  };

  // Quick setup
  const handleQuickSetup = async (template: DefaultRule, value: number) => {
    const existingRule = rules.find(r => r.rule_type === template.type);
    
    const ruleData: Partial<AlertRule> = {
      rule_name: template.name,
      rule_type: template.type,
      metric: template.metric,
      operator: template.operator,
      threshold: value,
      action_type: template.action,
      priority: template.priority,
      is_active: true
    };

    if (existingRule) {
      ruleData.id = existingRule.id;
    }

    await handleSaveRule(ruleData);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/ai"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-blue-400" />
                  Regras de Alerta
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Configure limites de CPA, ROAS e detectores automáticos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadRules}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
              </button>
              <button
                onClick={() => setEditingRule('new')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Regra
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-green-300">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Setup */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Setup Rápido</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Configure rapidamente os alertas mais importantes. Clique para expandir e definir seus limites.
          </p>

          <div className="grid gap-4">
            {defaultRules.map((template, idx) => (
              <QuickSetupCard
                key={idx}
                template={template}
                onSetup={handleQuickSetup}
                isActive={rules.some(r => r.rule_type === template.type && r.is_active)}
              />
            ))}
          </div>
        </section>

        {/* All Rules */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Suas Regras</h2>
            </div>
            <span className="text-sm text-gray-400">
              {rules.filter(r => r.is_active).length} ativas de {rules.length}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma regra configurada</p>
              <p className="text-sm text-gray-500 mt-1">Use o Setup Rápido acima ou crie uma regra personalizada</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {rules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggleRule}
                  onEdit={(r) => setEditingRule(r)}
                  onDelete={handleDeleteRule}
                  isLoading={isSaving}
                />
              ))}
            </div>
          )}
        </section>

        {/* Info Box */}
        <section className="mt-10 p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white">Como funciona o Auditor Automático</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-400">
                <li>• O sistema verifica suas campanhas automaticamente a cada <strong className="text-gray-200">30 minutos</strong></li>
                <li>• Quando uma regra é acionada, uma recomendação aparece no <strong className="text-gray-200">Action Center</strong></li>
                <li>• Regras de <strong className="text-red-400">alta prioridade</strong> podem pausar campanhas automaticamente</li>
                <li>• Você pode aplicar ou ignorar cada recomendação manualmente</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Rule Editor Modal */}
      <AnimatePresence>
        {editingRule && (
          <RuleEditor
            rule={editingRule === 'new' ? null : editingRule}
            onSave={handleSaveRule}
            onCancel={() => setEditingRule(null)}
            isLoading={isSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
