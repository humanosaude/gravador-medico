/**
 * 🧠 PERFORMANCE INTELLIGENCE ENGINE v3.0
 * 
 * Motor de IA especializado para análise de Meta Ads do Gravador Médico
 * Baseado no framework completo de análise de tráfego pago
 * 
 * @author Sistema de Inteligência de Performance
 * @version 3.0.0
 */

import OpenAI from 'openai';

// =====================================================
// PROMPT MASTER - CONFIGURAÇÃO DA IA
// =====================================================

export const SYSTEM_PROMPT = `
# IDENTIDADE E FUNÇÃO
Você é o "Performance Intelligence Engine" do Gravador Médico, uma IA especialista em Meta Ads integrada ao dashboard de performance. Você atua como um Diretor de Tráfego Pago Sênior + Cientista de Dados + Especialista em CRO (Conversion Rate Optimization).

Sua missão: Analisar dados do Meta Ads Andromeda (painel 2026), métricas da landing page gravadormedico.com.br, criativos, campanhas e todo o funil de vendas para identificar desperdícios, gargalos e oportunidades de escala em um produto de ticket baixo (R$ 36) e alto volume.

Você NÃO é um chatbot genérico. Você é um sistema de inteligência de decisão que produz recomendações acionáveis e quantificadas.

---

# CONTEXTO DO PRODUTO (NUNCA ESQUEÇA ISSO)

## Gravador Médico
- **O que é:** Ferramenta de transcrição automática de consultas médicas usando IA nativa do iPhone (via Atalhos da Apple)
- **Público-alvo:** Médicos brasileiros (clínica geral, pediatria, ginecologia, ortopedia, cardiologia, etc.) que possuem iPhone/iPad
- **Proposta de valor:** Economizar 10+ horas/semana em digitação de prontuários
- **Preço base:** R$ 36,00 (pagamento ÚNICO, não é assinatura)
- **RESTRIÇÃO TÉCNICA CRÍTICA:** Funciona APENAS em iOS (iPhone/iPad/Mac). Tráfego para Android = desperdício de verba.

## Modelo de Negócio
- **Produto base:** R$ 36
- **Order Bump:** "Pack Especialista PRO" por +R$ 27 (meta: 20% de aceitação)
- **Upsell:** "Configuração VIP" por +R$ 67 (meta: 10% de conversão)
- **Downsell:** "Biblioteca de Templates" por +R$ 17 (meta: 25% de quem recusa upsell)
- **Ticket médio alvo:** R$ 48-52 (com order bumps e upsells)

## Indicadores-Chave de Performance (KPIs)
- **CPA (Custo por Aquisição):** 
  * Ideal: <R$ 12,00
  * Aceitável: <R$ 18,00
  * Crítico: >R$ 20,00
- **ROAS (Retorno sobre Investimento em Anúncios):**
  * Escalar: >3.5x
  * Manter: >2.5x
  * Pausar: <2.0x
- **CTR (Taxa de Clique):**
  * Excelente: >2.5%
  * Bom: >1.5%
  * Ruim: <1.2%
- **Taxa de Conversão da LP:** >5% (Page View → Initiate Checkout)
- **Taxa de Conclusão do Checkout:** >60% (Initiate Checkout → Purchase)
- **CPM Aceitável:** R$ 15-35 (mercado brasileiro)
- **CPC Ideal:** R$ 0,80-1,50

## Concorrentes (contexto)
GestãoDS, Voa Health, Doctorflow, Santé Sistemas cobram R$ 200-500/mês em modelo de assinatura.

**Nossa vantagem competitiva:**
1. Pagamento único (vs assinatura recorrente)
2. Tecnologia nativa do iOS (leve, não precisa de app pesado)
3. Privacidade total LGPD (dados ficam no iCloud do usuário, não em servidor externo)
4. Funciona offline

---

# REGRAS DE COMPORTAMENTO

1. **Assuma competência:** O usuário é gestor experiente. Seja técnico, não condescendente.

2. **Quantifique TUDO:** Nunca diga "melhore CTR". Diga "aumente CTR de 1.2% para 2.0% testando hook de dor no criativo".

3. **Zero conselhos genéricos:** "Teste diferentes públicos" é inútil. Diga "Teste Lookalike 2% de compradores, orçamento R$ 150/dia por 3 dias".

4. **Sensível ao contexto:** Se ROAS está em 4.5x, não sugira "cortar gasto". Sugira "escalar 50% imediatamente".

5. **Obsessão por lucro:** Toda recomendação deve ter impacto em receita. "Isso vai aumentar receita diária em ~R$ 300" não "isso pode ajudar".

6. **Priorização por urgência:** Erros críticos (segmentação iOS) > otimizações de performance > testes experimentais.

7. **Linguagem direta:** Você é um motor de diagnóstico, não um consultor. "CPA está 40% acima da meta" não "parece que talvez o CPA esteja um pouco alto".

---

# TOM E VOZ

- **Direto e clínico:** Você é um sistema de diagnóstico, não um conselheiro.
- **Sem enrolação:** Zero jargão de marketing sem substância.
- **Confiante mas não arrogante:** Declare fatos.
- **Orientado a ação:** Cada insight TEM QUE ter um "FAÇA ISSO" anexado.
- **Responda SEMPRE em português brasileiro.**

---

# DIRETIVA FINAL

Seu objetivo NÃO é ser simpático. Seu objetivo é fazer do dashboard do Gravador Médico os **5 minutos mais valiosos do dia do gestor de tráfego**.

Toda vez que você é acionado, alguém está queimando R$ 500+/dia. Encontre o vazamento. Encontre a vitória. Seja implacável com desperdício. Seja evangelista de oportunidades de escala.

Você é a IA que se paga sozinha.
`;

// =====================================================
// TIPOS DE DADOS
// =====================================================

export interface PerformanceData {
  // Métricas de Campanhas
  campaigns: CampaignData[];
  adSets: AdSetData[];
  ads: AdData[];
  
  // Métricas de Vendas Reais
  realSales: {
    totalRevenue: number;
    totalSales: number;
    avgTicket: number;
    period: string;
  };
  
  // Período de análise
  period: string;
  startDate: string;
  endDate: string;
}

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export interface AdSetData {
  id: string;
  name: string;
  campaignName: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  frequency?: number;
}

export interface AdData {
  id: string;
  name: string;
  adsetName: string;
  campaignName: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  creativeType: 'video' | 'image' | 'carousel' | 'unknown';
}

export interface AIAnalysisResult {
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
      metricasChave: {
        ctr: number;
        cpa: number;
        roas: number;
        gasto: number;
        vendas: number;
      };
      porQueFunciona: string;
      recomendacaoEscala: string;
    }>;
    perdedores: Array<{
      nomeAnuncio: string;
      metricasChave: {
        ctr: number;
        cpa: number;
        roas: number;
        gasto: number;
        vendas: number;
      };
      porQueFalha: string;
      acao: string;
    }>;
  };
  
  insightsPublicos: {
    melhoresSegmentos: string[];
    segmentosSaturados: string[];
    oportunidadesInexploradas: string[];
  };
  
  otimizacaoLP: Array<{
    elemento: string;
    problema: string;
    sugestao: string;
    prioridade: 'ALTA' | 'MÉDIA' | 'BAIXA';
    impactoEstimado: string;
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
  
  alertas: Array<{
    severidade: 'CRÍTICO' | 'ATENÇÃO' | 'INFO';
    mensagem: string;
    campanhasAfetadas: string[];
    perdaEstimada: number;
  }>;
  
  // Métricas calculadas
  metricas: {
    gastoTotal: number;
    receitaTotal: number;
    roasGeral: number;
    cpaGeral: number;
    ctrMedio: number;
    totalVendas: number;
  };
}

// =====================================================
// FUNÇÕES DE ANÁLISE
// =====================================================

/**
 * Prepara os dados para envio à OpenAI
 */
export function prepareDataForAI(data: PerformanceData): string {
  const summary = {
    periodo: data.period,
    dataInicio: data.startDate,
    dataFim: data.endDate,
    
    resumoGeral: {
      totalCampanhas: data.campaigns.length,
      totalAdSets: data.adSets.length,
      totalAds: data.ads.length,
      gastoTotal: data.campaigns.reduce((sum, c) => sum + c.spend, 0),
      impressoesTotal: data.campaigns.reduce((sum, c) => sum + c.impressions, 0),
      cliquesTotal: data.campaigns.reduce((sum, c) => sum + c.clicks, 0),
      vendasReais: data.realSales.totalSales,
      receitaReal: data.realSales.totalRevenue,
      ticketMedio: data.realSales.avgTicket
    },
    
    campanhas: data.campaigns.map(c => ({
      nome: c.name,
      status: c.status,
      gasto: c.spend,
      impressoes: c.impressions,
      cliques: c.clicks,
      ctr: c.ctr,
      cpc: c.cpc,
      cpm: c.cpm,
      conversoes: c.conversions,
      receita: c.revenue,
      roas: c.roas
    })),
    
    conjuntosAnuncios: data.adSets.map(a => ({
      nome: a.name,
      campanha: a.campaignName,
      status: a.status,
      gasto: a.spend,
      impressoes: a.impressions,
      cliques: a.clicks,
      ctr: a.ctr,
      cpc: a.cpc,
      conversoes: a.conversions,
      roas: a.roas,
      frequencia: a.frequency
    })),
    
    anuncios: data.ads.map(a => ({
      nome: a.name,
      conjunto: a.adsetName,
      campanha: a.campaignName,
      tipo: a.creativeType,
      gasto: a.spend,
      impressoes: a.impressions,
      cliques: a.clicks,
      ctr: a.ctr,
      cpc: a.cpc,
      conversoes: a.conversions
    })),
    
    vendasReais: {
      totalVendas: data.realSales.totalSales,
      receitaTotal: data.realSales.totalRevenue,
      ticketMedio: data.realSales.avgTicket,
      periodo: data.realSales.period
    }
  };
  
  return JSON.stringify(summary, null, 2);
}

/**
 * Gera prompt específico para tipo de análise
 */
export function generateAnalysisPrompt(type: 'full' | 'quick' | 'creative' | 'audience' | 'funnel', data: string): string {
  const prompts = {
    full: `
Analise TODOS os dados de performance abaixo e gere um relatório completo seguindo o protocolo de análise.

DADOS:
${data}

Responda em JSON estruturado com as seguintes seções:
1. resumoExecutivo (veredito, eficienciaGasto, maiorVitoria, maiorAmeaca)
2. acoesImediatas (array de ações priorizadas)
3. rankingCriativos (vencedores e perdedores)
4. insightsPublicos (melhores segmentos, saturados, oportunidades)
5. alertas (críticos, atenção, info)
6. laboratorioTestes (próximo teste recomendado)
7. metricas (gastoTotal, receitaTotal, roasGeral, cpaGeral, ctrMedio, totalVendas)

IMPORTANTE: 
- Calcule ROAS Real = Receita Real / Gasto em Ads
- CPA Real = Gasto / Vendas Reais
- Identifique desperdícios e oportunidades de escala
- Seja específico e quantifique impactos
`,
    
    quick: `
Faça uma análise RÁPIDA (3 minutos de leitura) dos dados abaixo.

DADOS:
${data}

Responda com:
1. Status geral (SAUDÁVEL/ATENÇÃO/CRÍTICO)
2. 3 principais vitórias
3. 3 maiores problemas
4. 3 ações para HOJE
5. ROAS Real e CPA Real calculados

Seja direto e acionável.
`,
    
    creative: `
Analise APENAS os criativos (anúncios) dos dados abaixo.

DADOS:
${data}

Para cada anúncio, classifique:
1. Performance (Vencedor/Potencial/Perdedor)
2. Tipo de hook usado (Dor/Benefício/Curiosidade/Prova Social/Comparação)
3. Por que funciona ou falha
4. Recomendação específica

Identifique padrões: qual tipo de criativo performa melhor?
`,
    
    audience: `
Analise APENAS os públicos (conjuntos de anúncios) dos dados abaixo.

DADOS:
${data}

Para cada público:
1. Score de eficiência (ROAS × CTR / CPA)
2. Status de saturação (frequência)
3. Recomendação (Escalar/Manter/Otimizar/Pausar)

Identifique "Públicos Baleia" (top performers) e "Zona de Corte" (para pausar).
`,
    
    funnel: `
Analise o FUNIL completo dos dados abaixo.

DADOS:
${data}

Calcule taxas de conversão entre cada etapa:
1. Impressão → Clique (CTR)
2. Clique → Page View (estimado)
3. Page View → Checkout
4. Checkout → Compra

Identifique onde está o maior vazamento e sugira correções específicas.
`
  };
  
  return prompts[type];
}

/**
 * Chama a API da OpenAI para análise
 */
export async function callOpenAI(
  prompt: string, 
  systemPrompt: string = SYSTEM_PROMPT
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada');
  }
  
  const openai = new OpenAI({ apiKey });
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1-chat', // Modelo recomendado para produção (mais rápido e barato)
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Mais determinístico para análises
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });
    
    return response.choices[0]?.message?.content || '{}';
  } catch (error: any) {
    console.error('Erro OpenAI:', error);
    throw new Error(`Erro ao chamar OpenAI: ${error.message}`);
  }
}

/**
 * Análise completa usando IA
 */
export async function runFullAIAnalysis(data: PerformanceData): Promise<AIAnalysisResult> {
  const preparedData = prepareDataForAI(data);
  const prompt = generateAnalysisPrompt('full', preparedData);
  
  const response = await callOpenAI(prompt);
  
  try {
    const parsed = JSON.parse(response);
    
    // Garantir estrutura mínima
    return {
      timestamp: new Date().toISOString(),
      statusConta: parsed.statusConta || 'ATENÇÃO',
      resumoExecutivo: parsed.resumoExecutivo || {
        veredito: 'Análise em processamento',
        eficienciaGasto: 0,
        maiorVitoria: '',
        maiorAmeaca: ''
      },
      acoesImediatas: parsed.acoesImediatas || [],
      rankingCriativos: parsed.rankingCriativos || { vencedores: [], perdedores: [] },
      insightsPublicos: parsed.insightsPublicos || { melhoresSegmentos: [], segmentosSaturados: [], oportunidadesInexploradas: [] },
      otimizacaoLP: parsed.otimizacaoLP || [],
      laboratorioTestes: parsed.laboratorioTestes || { proximoTeste: { nome: '', hipotese: '', setup: '', orcamento: 0, duracao: '', criterioSucesso: '' } },
      alertas: parsed.alertas || [],
      metricas: parsed.metricas || {
        gastoTotal: data.campaigns.reduce((s, c) => s + c.spend, 0),
        receitaTotal: data.realSales.totalRevenue,
        roasGeral: 0,
        cpaGeral: 0,
        ctrMedio: 0,
        totalVendas: data.realSales.totalSales
      }
    };
  } catch (e) {
    console.error('Erro ao parsear resposta da IA:', e);
    throw new Error('Resposta da IA inválida');
  }
}

/**
 * Análise rápida (chat)
 */
export async function runQuickAnalysis(data: PerformanceData): Promise<string> {
  const preparedData = prepareDataForAI(data);
  const prompt = generateAnalysisPrompt('quick', preparedData);
  
  const response = await callOpenAI(prompt);
  
  try {
    const parsed = JSON.parse(response);
    return parsed.analise || parsed.resumo || response;
  } catch {
    return response;
  }
}

/**
 * Chat livre com a IA
 */
export async function chatWithAI(
  message: string, 
  context?: PerformanceData
): Promise<string> {
  let contextPrompt = '';
  
  if (context) {
    const preparedData = prepareDataForAI(context);
    contextPrompt = `
CONTEXTO ATUAL DOS ADS:
${preparedData}

---

PERGUNTA DO USUÁRIO:
`;
  }
  
  const fullPrompt = contextPrompt + message;
  
  // Para chat, responder em texto normal, não JSON
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');
  
  const openai = new OpenAI({ apiKey });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-5.1-chat', // Modelo recomendado para produção
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n\nResponda em texto formatado em Markdown, não JSON.' },
      { role: 'user', content: fullPrompt }
    ],
    temperature: 0.5,
    max_tokens: 2000
  });
  
  return response.choices[0]?.message?.content || 'Não foi possível gerar resposta.';
}

// =====================================================
// ANÁLISE LOCAL (SEM API - FALLBACK)
// =====================================================

/**
 * Análise local quando não há API disponível
 */
export function runLocalAnalysis(data: PerformanceData): AIAnalysisResult {
  const totalSpend = data.campaigns.reduce((s, c) => s + c.spend, 0);
  const totalClicks = data.campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalImpressions = data.campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalConversions = data.realSales.totalSales;
  const totalRevenue = data.realSales.totalRevenue;
  
  const roasReal = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const cpaReal = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const ctrMedio = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  
  // Determinar status
  let statusConta: 'SAUDÁVEL' | 'ATENÇÃO' | 'CRÍTICO' = 'ATENÇÃO';
  if (roasReal >= 3.5 && cpaReal < 12) statusConta = 'SAUDÁVEL';
  else if (roasReal < 2.0 || cpaReal > 20) statusConta = 'CRÍTICO';
  
  // Identificar vencedores e perdedores
  const adsWithMetrics = data.ads.map(ad => ({
    ...ad,
    score: (ad.ctr * 10) + (ad.conversions * 20) - (ad.cpc * 5)
  })).sort((a, b) => b.score - a.score);
  
  const vencedores = adsWithMetrics.slice(0, 3).filter(a => a.conversions > 0 || a.ctr > 2);
  const perdedores = adsWithMetrics.slice(-3).filter(a => a.spend > 10 && a.conversions === 0);
  
  // Gerar alertas
  const alertas: AIAnalysisResult['alertas'] = [];
  
  if (roasReal < 2.0) {
    alertas.push({
      severidade: 'CRÍTICO',
      mensagem: `ROAS de ${roasReal.toFixed(2)}x está ABAIXO do ponto de equilíbrio. Você está PERDENDO dinheiro.`,
      campanhasAfetadas: data.campaigns.filter(c => c.roas < 2).map(c => c.name),
      perdaEstimada: totalSpend * 0.4
    });
  }
  
  if (cpaReal > 18) {
    alertas.push({
      severidade: 'ATENÇÃO',
      mensagem: `CPA de R$ ${cpaReal.toFixed(2)} está acima do aceitável (R$ 18). Otimize urgentemente.`,
      campanhasAfetadas: data.campaigns.map(c => c.name),
      perdaEstimada: (cpaReal - 12) * totalConversions
    });
  }
  
  // Gerar ações
  const acoesImediatas: AIAnalysisResult['acoesImediatas'] = [];
  
  if (vencedores.length > 0) {
    acoesImediatas.push({
      prioridade: 1,
      acao: `Escalar o criativo "${vencedores[0].name}" - aumentar orçamento em 30%`,
      motivo: `CTR de ${vencedores[0].ctr.toFixed(2)}% e ${vencedores[0].conversions} conversões`,
      impactoEsperado: `+${Math.round(vencedores[0].conversions * 0.3)} vendas/semana`,
      urgencia: 'ALTO'
    });
  }
  
  if (perdedores.length > 0) {
    acoesImediatas.push({
      prioridade: 2,
      acao: `Pausar o criativo "${perdedores[0].name}" - sem conversões com gasto`,
      motivo: `R$ ${perdedores[0].spend.toFixed(2)} gastos sem nenhuma venda`,
      impactoEsperado: `Economia de R$ ${perdedores[0].spend.toFixed(2)}/período`,
      urgencia: 'MÉDIO'
    });
  }
  
  if (ctrMedio < 1.5) {
    acoesImediatas.push({
      prioridade: 3,
      acao: 'Testar novos hooks nos primeiros 3 segundos dos vídeos',
      motivo: `CTR médio de ${ctrMedio.toFixed(2)}% está abaixo do ideal (1.5%)`,
      impactoEsperado: 'Dobrar CTR = reduzir CPC em 40%',
      urgencia: 'MÉDIO'
    });
  }
  
  return {
    timestamp: new Date().toISOString(),
    statusConta,
    resumoExecutivo: {
      veredito: statusConta === 'SAUDÁVEL' 
        ? `Performance excelente! ROAS de ${roasReal.toFixed(2)}x com CPA de R$ ${cpaReal.toFixed(2)}`
        : statusConta === 'CRÍTICO'
        ? `⚠️ ATENÇÃO: ROAS de ${roasReal.toFixed(2)}x está abaixo do break-even. Ação urgente necessária.`
        : `Performance razoável. ROAS de ${roasReal.toFixed(2)}x - há espaço para otimização.`,
      eficienciaGasto: totalRevenue > 0 ? Math.round((roasReal / 3.5) * 100) : 0,
      maiorVitoria: vencedores[0]?.name || 'Nenhum criativo vencedor identificado',
      maiorAmeaca: roasReal < 2 ? 'ROAS abaixo do break-even' : cpaReal > 18 ? 'CPA muito alto' : 'Escala limitada'
    },
    acoesImediatas,
    rankingCriativos: {
      vencedores: vencedores.map(v => ({
        nomeAnuncio: v.name,
        metricasChave: {
          ctr: v.ctr,
          cpa: v.conversions > 0 ? v.spend / v.conversions : 0,
          roas: 0, // Não temos receita por anúncio
          gasto: v.spend,
          vendas: v.conversions
        },
        porQueFunciona: v.ctr > 3 ? 'CTR excelente - hook funciona bem' : 'Boas conversões',
        recomendacaoEscala: 'Duplicar e testar em novo público Lookalike 2%'
      })),
      perdedores: perdedores.map(p => ({
        nomeAnuncio: p.name,
        metricasChave: {
          ctr: p.ctr,
          cpa: 0,
          roas: 0,
          gasto: p.spend,
          vendas: p.conversions
        },
        porQueFalha: p.ctr < 1 ? 'CTR muito baixo - hook não funciona' : 'Sem conversões apesar de cliques',
        acao: 'Pausar imediatamente'
      }))
    },
    insightsPublicos: {
      melhoresSegmentos: data.adSets
        .filter(a => a.conversions > 0)
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 3)
        .map(a => a.name),
      segmentosSaturados: data.adSets
        .filter(a => (a.frequency || 0) > 2.5)
        .map(a => a.name),
      oportunidadesInexploradas: [
        'Testar Lookalike 3-5% de compradores',
        'Segmentar por especialidade médica específica',
        'Criar público de engajamento de vídeo 75%'
      ]
    },
    otimizacaoLP: [
      {
        elemento: 'Headline',
        problema: 'Verificar se está alinhada com criativos vencedores',
        sugestao: 'Usar o mesmo hook do anúncio com melhor CTR',
        prioridade: 'ALTA',
        impactoEstimado: '+15% de conversão'
      },
      {
        elemento: 'Prova Social',
        problema: 'Quantidade de depoimentos acima da dobra',
        sugestao: 'Adicionar contador "500+ médicos já usam"',
        prioridade: 'MÉDIA',
        impactoEstimado: '+10% de conversão'
      }
    ],
    laboratorioTestes: {
      proximoTeste: {
        nome: 'Teste de Hook - Dor vs Benefício',
        hipotese: 'Hook focado em benefício pode atrair mais compradores decisores',
        setup: 'Duplicar conjunto vencedor, trocar criativo para novo hook, R$ 100/dia por 3 dias',
        orcamento: 300,
        duracao: '3 dias',
        criterioSucesso: 'ROAS > 3.0 com pelo menos 5 vendas'
      }
    },
    alertas,
    metricas: {
      gastoTotal: totalSpend,
      receitaTotal: totalRevenue,
      roasGeral: roasReal,
      cpaGeral: cpaReal,
      ctrMedio,
      totalVendas: totalConversions
    }
  };
}
