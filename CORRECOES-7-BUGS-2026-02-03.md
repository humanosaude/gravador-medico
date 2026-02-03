# 🔧 CORREÇÕES DE BUGS - 2026-02-03

## ✅ Todos os 7 bugs foram corrigidos!

---

## 📋 Resumo das Correções

### 🔴 BUG #1: GPT Vision recebendo vídeo MP4
**Problema:** O código tentava enviar URL de vídeo MP4 direto para o GPT Vision, que só aceita imagens.

**Solução:** 
- Modificado `lib/ads/creative-analyzer.ts`
- Agora só usa frames JPEG extraídos pelo FFmpeg
- Se não tiver frames E não tiver thumbnail de imagem, faz análise apenas por texto

**Arquivo:** `lib/ads/creative-analyzer.ts` (linha ~320)

---

### 🔴 BUG #2: UUID inválido no banco
**Problema:** `campaign_id` do Meta (string numérica) sendo inserido em coluna UUID.

**Solução:**
- Criada migration `20260203_fix_campaign_id_and_instagram.sql`
- Altera tipo de `campaign_id` de UUID para TEXT
- Adiciona colunas `meta_ad_id`, `meta_creative_id`

**Para executar:**
```sql
-- Execute no Supabase SQL Editor
-- Arquivo: supabase/migrations/20260203_fix_campaign_id_and_instagram.sql
```

---

### 🔴 BUG #3: Evento de conversão errado
**Problema:** Campanhas de TRÁFEGO usando `OFFSITE_CONVERSIONS` e `CONTENT_VIEW`.

**Solução:**
- Criada função `getAdSetConfig()` que mapeia:
  - **TRÁFEGO** → `optimization_goal: 'LINK_CLICKS'` (sem pixel)
  - **VENDAS** → `optimization_goal: 'OFFSITE_CONVERSIONS'` + pixel + evento
  - **LEADS** → `optimization_goal: 'OFFSITE_CONVERSIONS'` + pixel + LEAD

**Arquivo:** `app/api/ads/launch-v2/route.ts` (linhas ~64-140)

---

### 🔴 BUG #4: Destino principal "Site" sem URL
**Problema:** Meta exige URL quando destino = Site.

**Solução:**
- URL já estava definida: `linkUrl` com fallback para `https://gravador-medico.com.br`
- Agora passada corretamente para `createVideoAdCreative()`

**Arquivo:** `app/api/ads/launch-v2/route.ts` (linha ~629 e ~1252)

---

### 🔴 BUG #5 & #6: Criativo não foi criado (Ad não subiu)
**Problema:** Para vídeos, o código só enfileirava para "cron processar" mas nunca criava o Ad.

**Solução:**
- Seção 6A agora faz o fluxo completo:
  1. `uploadVideoToMeta()` - Upload do vídeo
  2. `waitForVideoReady()` - Aguarda encoding
  3. `createVideoAdCreative()` - Cria AdCreative
  4. `createAd()` - Cria Ad vinculado ao AdSet
  5. Salva no banco com status `completed`

**Arquivo:** `app/api/ads/launch-v2/route.ts` (linhas ~1185-1300)

---

### 🔴 BUG #7: Instagram Account ID faltando
**Problema:** Conta do Instagram não vinculada nos anúncios.

**Solução:**
- Migration adiciona coluna `instagram_account_id` em `meta_ad_accounts`
- Valor padrão: `17841400008460674` (@segurancadosfilhos)

**Arquivo:** `supabase/migrations/20260203_fix_campaign_id_and_instagram.sql`

---

## 🎬 Video Preview no Cockpit
**Problema:** Os 2 players de vídeo não funcionavam após upload e após escolher copy.

**Solução:**
- Criada variável `localPreviewUrl` que mantém o blob URL local
- Preview agora usa `localPreviewUrl` (sempre funciona)
- `creativeUrl` (Supabase) usado apenas para envio à API

**Arquivo:** `components/ads/AdsLauncherPro.tsx`

---

## 📦 Arquivos Modificados

1. `components/ads/AdsLauncherPro.tsx` - Video preview fix
2. `lib/ads/creative-analyzer.ts` - GPT Vision fix (não enviar MP4)
3. `lib/ads/types.ts` - Adicionado `LANDING_PAGE_VIEWS` ao tipo
4. `app/api/ads/launch-v2/route.ts` - Fluxo completo de vídeo + optimization_goal correto
5. `supabase/migrations/20260203_fix_campaign_id_and_instagram.sql` - Nova migration
6. `middleware.ts` - CSP atualizado com `blob:` para preview de vídeo

---

## 🔥 CORREÇÃO ADICIONAL (03/02/2026 - Tarde)

### 🐛 Bug 8: Upload de Vídeo para Meta com 0 Bytes
**Problema:** Quando usava `creative_url` (vídeo já no Supabase), o arquivo era criado vazio e enviado para Meta com 0 bytes.

```
❌ Erro ao finalizar upload de vídeo: (#1363041) Invalid upload session given.
� Iniciando upload de vídeo: video.mp4 (0.00MB) ← ❌ ZERO BYTES!
```

**Correção:**
- Adicionada função `downloadVideoFromUrl()` em `app/api/ads/launch-v2/route.ts`
- Modificada `uploadVideoToMeta()` para aceitar `File | Buffer`
- Na criação de anúncios, se `file.size === 0`, baixa do Supabase primeiro

### 🐛 Bug 9: Preview de Vídeo não Exibia (CSP)
**Problema:** O `middleware.ts` tinha CSP sem `blob:` no `media-src`, bloqueando preview local.

**Correção:** `middleware.ts` linha 62:
```typescript
// ANTES:
"media-src 'self' data:",

// DEPOIS:
"media-src 'self' data: blob: https://*.supabase.co https://*.fbcdn.net",
```

---

## �🚀 Próximos Passos

1. **Executar a migration no Supabase:**
   ```bash
   # Via Supabase CLI
   supabase db push
   
   # Ou cole o SQL no Supabase Dashboard > SQL Editor
   ```

2. **Testar nova campanha de vídeo:**
   - Subir vídeo
   - Verificar se preview aparece ✓
   - Verificar se análise funciona
   - Verificar se Ad é criado na Meta
   - Console deve mostrar:
     ```
     ⬇️ Baixando vídeo do Supabase...
     ✅ Vídeo baixado: X.XX MB
     📹 Sessão de upload iniciada...
     ✅ Upload de vídeo concluído, ID: XXXXX
     ```

3. **Verificar no Meta Ads Manager:**
   - Campanha criada ✓
   - AdSet com targeting correto ✓
   - Ad com vídeo + copy ✓
   - URL do site preenchida ✓
