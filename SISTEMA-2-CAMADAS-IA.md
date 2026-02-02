# 🧠 Sistema de 2 Camadas de IA para Copywriting

## Visão Geral

O sistema transforma textos simples digitados pelo usuário (ex: "quero gerar tráfego no site") em **prompts profissionais de copywriting** que geram anúncios de alta conversão.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DO SISTEMA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👤 Usuário digita:                                              │
│  "quero gerar tráfego no site de alto volume para remarketing"  │
│                           ↓                                      │
│  ┌──────────────────────────────────────────────┐               │
│  │  🧠 CAMADA 1: Meta-Prompt Generator          │               │
│  │  - Analisa intenção do usuário               │               │
│  │  - Detecta estágio do funil                  │               │
│  │  - Define ângulo de copy (dor/ganho/urgência)│               │
│  │  - Gera prompt estruturado profissional      │               │
│  └──────────────────────────────────────────────┘               │
│                           ↓                                      │
│  ┌──────────────────────────────────────────────┐               │
│  │  🎨 CAMADA 2: GPT-5.2 Vision + Prompt         │               │
│  │  - Recebe prompt profissional da Camada 1   │               │
│  │  - Analisa imagem do anúncio                 │               │
│  │  - Gera copy seguindo estrutura profissional│               │
│  └──────────────────────────────────────────────┘               │
│                           ↓                                      │
│  📝 Copy Final do Anúncio (JSON):                               │
│  {                                                               │
│    "primary_text": "...",                                       │
│    "headline": "...",                                            │
│    "cta": "..."                                                  │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos do Sistema

| Arquivo | Função |
|---------|--------|
| `lib/ads/prompt-generator.ts` | **Camada 1** - Gera prompts profissionais |
| `lib/ads/creative-analyzer.ts` | **Camada 2** - Usa prompt + Vision para copy |
| `lib/ads/types.ts` | Tipos TypeScript |
| `app/api/ads/launch-v2/route.ts` | API que orquestra o fluxo |

---

## Funções Principais

### Camada 1: `generateCopywritingPrompt()`

```typescript
import { generateCopywritingPrompt } from '@/lib/ads/prompt-generator';

const result = await generateCopywritingPrompt(
  "quero vender direto para médicos que precisam economizar tempo"
);

// Retorna:
{
  professionalPrompt: "...", // Prompt estruturado completo
  analysis: {
    funnelStage: "FUNDO",
    intent: "conversion",
    copyAngle: "urgency",
    targetAudience: "Médicos sobrecarregados",
    primaryBenefit: "Economia de tempo",
    ctaStyle: "urgente"
  }
}
```

### Camada 2: `analyzeWithProfessionalPrompt()`

```typescript
import { analyzeWithProfessionalPrompt } from '@/lib/ads/creative-analyzer';

const copy = await analyzeWithProfessionalPrompt(
  imageUrl,
  professionalPrompt
);

// Retorna:
{
  primary_text: "Médico, você gasta 3h/dia digitando prontuários?...",
  headline: "Prontuário pronto em segundos",
  cta: "Começar Teste Grátis"
}
```

---

## Exemplos de Transformação

### Exemplo 1: Topo de Funil

**Input do usuário:**
```
quero gerar tráfego no site de alto volume para depois tentar remarketing
```

**Análise da Camada 1:**
- Funil: `TOPO`
- Intenção: `awareness`
- Ângulo: `curiosity`
- CTA: `baixa_friccao`

**Copy gerada:**
```
Primary: "Você perde horas digitando prontuários? Veja como a IA pode ajudar."
Headline: "Como médicos economizam 15h/semana"
CTA: "Ver Como Funciona"
```

### Exemplo 2: Fundo de Funil

**Input do usuário:**
```
quero vender direto para médicos que precisam economizar tempo
```

**Análise da Camada 1:**
- Funil: `FUNDO`
- Intenção: `conversion`
- Ângulo: `urgency`
- CTA: `urgente`

**Copy gerada:**
```
Primary: "🎯 Médico, você gasta 3h/dia digitando prontuários?

O Gravador Médico transcreve automaticamente suas consultas.

Mais de 2.000 médicos já economizam 15h/semana.

Teste grátis por 7 dias. Sem cartão."

Headline: "Prontuário pronto em 30 segundos"
CTA: "Começar Agora"
```

### Exemplo 3: Remarketing

**Input do usuário:**
```
remarketing para quem abandonou o checkout
```

**Análise da Camada 1:**
- Funil: `FUNDO`
- Intenção: `remarketing`
- Ângulo: `urgency`
- CTA: `urgente`

**Copy gerada:**
```
Primary: "⏰ Sua economia de 15h/semana está esperando!

Você quase começou a usar o Gravador Médico.

Complete agora e ganhe 30% OFF no primeiro mês.

Oferta expira em 24h!"

Headline: "Não perca seu desconto"
CTA: "Finalizar Agora"
```

---

## Configurações na API

O sistema é ativado automaticamente, mas pode ser desativado:

```typescript
// No FormData enviado para /api/ads/launch-v2
formData.append('use_two_layer_system', 'true');  // Ativa (padrão)
formData.append('use_two_layer_system', 'false'); // Desativa
```

---

## Resposta da API

A API retorna informações sobre o sistema de IA usado:

```json
{
  "success": true,
  "data": {
    "campaign": { "id": "...", "name": "..." },
    "aiSystem": {
      "twoLayerUsed": true,
      "analysis": {
        "funnelStage": "TOPO",
        "intent": "awareness",
        "copyAngle": "curiosity"
      },
      "promptPreview": "Você é um copywriter especialista..."
    }
  }
}
```

---

## Contexto do Produto

O sistema já possui contexto embutido sobre o Gravador Médico:

- **Nome:** Gravador Médico
- **Função:** Transcrição automática de consultas via IA
- **Dor principal:** Médicos perdem 3h/dia digitando prontuários
- **Benefício:** Economiza 15h/semana
- **Prova social:** 2.000+ médicos ativos
- **Preço:** Teste grátis 7 dias, depois R$ 149/mês

---

## Fallback

Se a Camada 1 falhar, o sistema automaticamente usa:
1. Detecção de funil por palavras-chave
2. Prompt fallback estruturado
3. Análise Vision padrão (sem prompt profissional)

---

## Logs no Console

```
🤖 Etapa 2: Sistema de 2 Camadas de IA...
   🧠 [Camada 1] Gerando prompt profissional de copywriting...
   ✅ [Camada 1] Análise: { funil: 'TOPO', intencao: 'awareness', angulo: 'curiosity' }
   🎨 [Camada 2] Gerando copy com prompt profissional + Vision...
   ✅ [Camada 2] 3 imagens analisadas com prompt profissional
```

---

## Benefícios do Sistema

| Antes | Depois |
|-------|--------|
| Usuário precisa saber escrever prompts | Usuário escreve objetivo em linguagem natural |
| Copy genérica | Copy adaptada ao estágio do funil |
| Mesmo CTA para tudo | CTA contextualizado (suave/urgente) |
| Sem análise de intenção | IA detecta intenção automaticamente |

**Resultado:** Complexidade escondida. UX simples.
