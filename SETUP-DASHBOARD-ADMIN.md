# 🚀 SETUP COMPLETO DO DASHBOARD ADMIN

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### FASE 1: CONFIGURAR SUPABASE (15 minutos)

#### 1.1 - Acessar Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Entre no seu projeto (ou crie um novo)
3. Copie suas credenciais

#### 1.2 - Pegar as Credenciais
**Settings → API**

Copie:
- `Project URL` → Exemplo: `https://xxxxxxxxxxx.supabase.co`
- `anon public` key → Começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- `service_role` key → ⚠️ SECRETA - NUNCA expor no frontend!

#### 1.3 - Atualizar .env.local
Substitua no arquivo `.env.local`:

```bash
# ANTES (placeholders)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# DEPOIS (suas credenciais reais)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (DIFERENTE DA ANON)
```

⚠️ **ATENÇÃO:** A `SERVICE_ROLE_KEY` é DIFERENTE da `ANON_KEY`!

#### 1.4 - Criar o Schema no Banco
1. No Supabase Dashboard: **SQL Editor** → **New Query**
2. Abra o arquivo: `supabase-admin-schema.sql`
3. **Copie TUDO** e cole no editor
4. Clique em **RUN** (▶️ no canto inferior direito)
5. Aguarde a mensagem: ✅ "Success. No rows returned"

---

### FASE 2: CRIAR SEU USUÁRIO ADMIN (5 minutos)

#### 2.1 - Criar conta no Supabase Auth
1. No Supabase Dashboard: **Authentication** → **Users** → **Add User**
2. Preencha:
   - **Email:** seu@email.com
   - **Password:** Crie uma senha forte
   - **Auto Confirm User:** ✅ MARQUE (para não precisar confirmar email)
3. Clique em **Create User**
4. **COPIE O UUID** que apareceu (algo como: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

#### 2.2 - Tornar seu usuário ADMIN
1. No Supabase: **SQL Editor** → **New Query**
2. Cole este código (substitua o UUID e email):

```sql
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'SEU-UUID-AQUI',  -- Cole o UUID que copiou
  'seu@email.com',  -- Seu email
  'Seu Nome Completo',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

3. Clique em **RUN**
4. ✅ Pronto! Agora você é admin

---

### FASE 3: TESTAR A CONEXÃO (2 minutos)

#### 3.1 - Reiniciar o servidor Next.js
No terminal:
```bash
# Pare o servidor (Ctrl+C se estiver rodando)
# Rode novamente:
npm run dev
```

#### 3.2 - Verificar no console do navegador
Abra: http://localhost:3000

Aperte **F12** (DevTools) → **Console**

Se aparecer erros de Supabase, as credenciais estão erradas.

---

### FASE 4: PLUGINS DO VS CODE RECOMENDADOS

Instale estes plugins para acelerar o desenvolvimento:

1. **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
   - Autocomplete de classes Tailwind

2. **ES7+ React/Redux snippets** (dsznajder.es7-react-js-snippets)
   - Atalhos: `rafce` cria componente completo

3. **Pretty TypeScript Errors** (yoavbls.pretty-ts-errors)
   - Erros de TypeScript mais legíveis

4. **Supabase** (supabase.supabase-vscode)
   - Visualizar tabelas direto no VS Code

5. **Error Lens** (usernamehw.errorlens)
   - Mostra erros inline no código

**Como instalar:**
- Abra o VS Code
- Clique no ícone de Extensions (Ctrl+Shift+X)
- Busque pelo nome
- Clique em **Install**

---

## 🎯 PRÓXIMOS PASSOS

Após concluir o setup:

1. ✅ Atualizar webhook para salvar no Supabase
2. ✅ Criar página /admin/dashboard
3. ✅ Implementar middleware de autenticação
4. ✅ Criar componentes de métricas e gráficos

---

## 🆘 TROUBLESHOOTING

### Erro: "Missing Supabase environment variables"
**Solução:** Certifique-se que o `.env.local` está na RAIZ do projeto e reiniciou o servidor (npm run dev)

### Erro: "Invalid API key"
**Solução:** Verifique se copiou a chave completa (incluindo o final). A chave tem ~200+ caracteres.

### Erro ao rodar o SQL
**Solução:** Execute o SQL em partes. Rode primeiro as CREATE TABLE, depois os índices, depois os RLS.

### Não consigo fazer login como admin
**Solução:** Verifique se:
1. Criou o usuário na aba Authentication
2. Inseriu o UUID correto na tabela profiles
3. O campo `role` está como 'admin' (não 'Admin' ou 'ADMIN')

---

## 📞 SUPORTE

Se tiver dúvidas, me envie:
1. A mensagem de erro completa
2. Print da aba Network do DevTools (F12)
3. Print do SQL Editor após rodar o schema

---

**IMPORTANTE:** Nunca commite o `.env.local` no Git! Ele já está no .gitignore.
