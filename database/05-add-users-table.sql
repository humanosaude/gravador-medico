-- =============================================
-- GRAVADOR MÉDICO - TABELA USERS
-- =============================================
-- Adiciona tabela de usuários para autenticação
-- =============================================

-- ========================================
-- TABELA: users (Usuários do Sistema)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dados de autenticação
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT, -- Hash bcrypt da senha
  
  -- Relacionamento com APPMAX
  appmax_customer_id TEXT,
  
  -- Controle de acesso
  has_access BOOLEAN DEFAULT true,
  
  -- Role (futuro uso)
  role TEXT DEFAULT 'user', -- user, admin, support
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna password_hash se a tabela já existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_appmax_customer_id ON users(appmax_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_has_access ON users(has_access);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de users" ON users;
CREATE POLICY "Permitir leitura de users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de users" ON users;
CREATE POLICY "Permitir escrita de users" ON users FOR ALL USING (true);

-- ========================================
-- CRIAR USUÁRIOS ADMIN
-- ========================================
-- Insere os 2 admins com senhas hash (bcrypt)

-- Admin 1: contato@helciomattos.com.br
-- Senha: Beagle3005*
INSERT INTO users (email, name, password_hash, has_access, role)
VALUES (
  'contato@helciomattos.com.br', 
  'Helcio Mattos', 
  '$2b$10$BS1dHmS0hydDWeRZVtvQo.eTkgF3jRlbex7iWxCLyi63WNUUZ2wYC',
  true, 
  'admin'
)
ON CONFLICT (email) DO UPDATE
SET 
  password_hash = '$2b$10$BS1dHmS0hydDWeRZVtvQo.eTkgF3jRlbex7iWxCLyi63WNUUZ2wYC',
  has_access = true,
  role = 'admin',
  updated_at = NOW();

-- Admin 2: gabriel_acardoso@hotmail.com
-- Senha: 26+Sucesso+GH
INSERT INTO users (email, name, password_hash, has_access, role)
VALUES (
  'gabriel_acardoso@hotmail.com', 
  'Gabriel Cardoso', 
  '$2b$10$tgjV4CZVgzbv815GhSqGaez46r.0URYDFWQEFJ.PyhSxvyQ.Me3Ci',
  true, 
  'admin'
)
ON CONFLICT (email) DO UPDATE
SET 
  password_hash = '$2b$10$tgjV4CZVgzbv815GhSqGaez46r.0URYDFWQEFJ.PyhSxvyQ.Me3Ci',
  has_access = true,
  role = 'admin',
  updated_at = NOW();

-- ========================================
-- FIM
-- ========================================
-- Execute este script no Supabase SQL Editor
-- 
-- ACESSO:
-- Email: contato@helciomattos.com.br | Senha: Beagle3005*
-- Email: gabriel_acardoso@hotmail.com | Senha: 26+Sucesso+GH
