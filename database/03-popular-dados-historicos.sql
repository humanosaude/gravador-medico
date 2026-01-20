-- ========================================
-- POPULAR CLIENTES HISTÓRICOS
-- ========================================
-- Este script cria registros na tabela customers
-- a partir das vendas já existentes na tabela sales

INSERT INTO customers (
  appmax_customer_id,
  name,
  email,
  phone,
  cpf,
  created_at,
  updated_at
)
SELECT DISTINCT ON (customer_email)
  customer_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_cpf,
  MIN(created_at) OVER (PARTITION BY customer_email),
  MAX(updated_at) OVER (PARTITION BY customer_email)
FROM sales
WHERE customer_email IS NOT NULL
  AND customer_email != ''
ON CONFLICT (email) DO UPDATE SET
  appmax_customer_id = COALESCE(EXCLUDED.appmax_customer_id, customers.appmax_customer_id),
  name = COALESCE(EXCLUDED.name, customers.name),
  phone = COALESCE(EXCLUDED.phone, customers.phone),
  cpf = COALESCE(EXCLUDED.cpf, customers.cpf),
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- VINCULAR VENDAS AOS CLIENTES
-- ========================================
-- Atualiza customer_id nas vendas existentes

UPDATE sales s
SET customer_id = c.id
FROM customers c
WHERE s.customer_email = c.email
  AND s.customer_id IS NULL;

-- ========================================
-- POPULAR PRODUTOS HISTÓRICOS
-- ========================================
-- Cria produtos a partir dos dados de vendas

INSERT INTO products (
  appmax_product_id,
  sku,
  name,
  price,
  category,
  is_active,
  created_at,
  updated_at
)
SELECT DISTINCT ON (product_sku)
  product_id::text,
  product_sku,
  product_name,
  product_price,
  CASE 
    WHEN product_name ILIKE '%pro%' THEN 'Premium'
    WHEN product_name ILIKE '%basic%' THEN 'Básico'
    ELSE 'Padrão'
  END,
  true,
  MIN(created_at) OVER (PARTITION BY product_sku),
  MAX(updated_at) OVER (PARTITION BY product_sku)
FROM sales
WHERE product_sku IS NOT NULL
  AND product_sku != ''
ON CONFLICT (sku) DO UPDATE SET
  appmax_product_id = COALESCE(EXCLUDED.appmax_product_id, products.appmax_product_id),
  name = COALESCE(EXCLUDED.name, products.name),
  price = EXCLUDED.price, -- Sempre atualizar preço
  category = COALESCE(EXCLUDED.category, products.category),
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- CRIAR ITENS DE VENDA (sales_items)
-- ========================================
-- Popula sales_items a partir das vendas existentes
-- OBS: Assumindo 1 produto por venda (simplificado)

INSERT INTO sales_items (
  sale_id,
  product_id,
  quantity,
  unit_price,
  subtotal,
  created_at
)
SELECT 
  s.id,
  p.id,
  1, -- quantidade padrão
  s.product_price,
  s.product_price,
  s.created_at
FROM sales s
INNER JOIN products p ON p.sku = s.product_sku
WHERE NOT EXISTS (
  SELECT 1 FROM sales_items si WHERE si.sale_id = s.id
)
  AND s.product_sku IS NOT NULL;

-- ========================================
-- CRIAR CONTATOS CRM AUTOMÁTICOS
-- ========================================
-- Popula crm_contacts a partir dos clientes

INSERT INTO crm_contacts (
  customer_id,
  name,
  email,
  phone,
  source,
  stage,
  status,
  estimated_value,
  last_interaction_at,
  created_at,
  updated_at
)
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone,
  'appmax',
  CASE 
    WHEN c.total_orders >= 3 THEN 'won'
    WHEN c.total_orders >= 1 THEN 'negotiation'
    ELSE 'lead'
  END,
  CASE
    WHEN c.status = 'active' THEN 'active'
    ELSE 'inactive'
  END,
  c.total_spent,
  c.last_purchase_at,
  c.first_purchase_at,
  c.updated_at
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM crm_contacts crm WHERE crm.customer_id = c.id
);

-- ========================================
-- ATUALIZAR MÉTRICAS DOS CLIENTES
-- ========================================
-- Recalcula total_orders, total_spent, etc.

UPDATE customers c
SET 
  total_orders = (
    SELECT COUNT(*) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  total_spent = (
    SELECT COALESCE(SUM(s.amount), 0) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  average_order_value = (
    SELECT COALESCE(AVG(s.amount), 0) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  last_purchase_at = (
    SELECT MAX(s.created_at) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  first_purchase_at = (
    SELECT MIN(s.created_at) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  updated_at = NOW()
WHERE c.id IN (
  SELECT DISTINCT customer_id FROM sales WHERE customer_id IS NOT NULL
);

-- ========================================
-- ATUALIZAR MÉTRICAS DOS PRODUTOS
-- ========================================
-- Recalcula vendas, receita, etc.

UPDATE products p
SET 
  total_orders = (
    SELECT COUNT(DISTINCT si.sale_id)
    FROM sales_items si
    WHERE si.product_id = p.id
  ),
  total_quantity_sold = (
    SELECT COALESCE(SUM(si.quantity), 0)
    FROM sales_items si
    WHERE si.product_id = p.id
  ),
  total_revenue = (
    SELECT COALESCE(SUM(si.subtotal), 0)
    FROM sales_items si
    INNER JOIN sales s ON s.id = si.sale_id
    WHERE si.product_id = p.id
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  average_price = (
    SELECT COALESCE(AVG(si.unit_price), p.price)
    FROM sales_items si
    WHERE si.product_id = p.id
  ),
  updated_at = NOW()
WHERE p.id IN (
  SELECT DISTINCT product_id FROM sales_items
);

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================
-- Exibe estatísticas da migração

SELECT 
  'Clientes criados' AS metrica,
  COUNT(*) AS quantidade
FROM customers
UNION ALL
SELECT 
  'Produtos criados' AS metrica,
  COUNT(*) AS quantidade
FROM products
UNION ALL
SELECT 
  'Vendas vinculadas' AS metrica,
  COUNT(*) AS quantidade
FROM sales
WHERE customer_id IS NOT NULL
UNION ALL
SELECT 
  'Itens de venda criados' AS metrica,
  COUNT(*) AS quantidade
FROM sales_items
UNION ALL
SELECT 
  'Contatos CRM criados' AS metrica,
  COUNT(*) AS quantidade
FROM crm_contacts;

-- Exibir clientes com mais vendas (Top 10)
SELECT 
  c.name,
  c.email,
  c.total_orders AS vendas,
  c.total_spent AS receita_total,
  c.average_order_value AS ticket_medio,
  c.segment AS segmento
FROM customers c
ORDER BY c.total_spent DESC
LIMIT 10;

-- Exibir produtos mais vendidos (Top 10)
SELECT 
  p.name,
  p.sku,
  p.total_orders AS vendas,
  p.total_quantity_sold AS qtd_vendida,
  p.total_revenue AS receita_total,
  p.category AS categoria
FROM products p
ORDER BY p.total_revenue DESC
LIMIT 10;

COMMIT;
