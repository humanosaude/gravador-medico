#!/usr/bin/env node
// =====================================================
// 📧 SCRIPT: Reprocessar E-mails Pendentes
// =====================================================
// Uso: node scripts/reprocess-pending-emails.js
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// Carregar .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const lovableEdgeFunctionUrl = process.env.NEXT_PUBLIC_LOVABLE_EDGE_FUNCTION_URL;
const apiSecret = 'webhook-appmax-2026-secure-key';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis SUPABASE não configuradas');
  process.exit(1);
}

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// Gerar senha segura
function generateSecurePassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Criar usuário no Lovable
async function createLovableUser(email, password, fullName) {
  try {
    console.log(`  👤 Criando usuário no Lovable: ${email}`);
    
    const response = await fetch(lovableEdgeFunctionUrl, {
      method: 'POST',
      headers: {
        'x-api-secret': apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Se usuário já existe, considerar como sucesso
      if (data.error?.includes('já existe') || data.error?.includes('already') || data.message?.includes('exists')) {
        console.log(`  ℹ️ Usuário já existe no Lovable - prosseguindo com envio de e-mail`);
        return { success: true, alreadyExists: true };
      }
      throw new Error(data.error || data.message || 'Erro ao criar usuário');
    }
    
    console.log(`  ✅ Usuário criado: ${data.user?.id}`);
    return { success: true, user: data.user };
  } catch (error) {
    console.error(`  ❌ Erro ao criar usuário:`, error.message);
    return { success: false, error: error.message };
  }
}

// Enviar e-mail de boas-vindas
async function sendWelcomeEmail(params) {
  try {
    console.log(`  📧 Enviando e-mail para: ${params.to}`);
    
    // Formatar ID do pedido
    const formatOrderId = (id) => {
      if (id.includes('-')) {
        return id.split('-')[0].toUpperCase();
      }
      if (id.startsWith('manual-')) {
        return id.replace('manual-', '').replace(/-/g, ' ').toUpperCase();
      }
      return id.substring(0, 8).toUpperCase();
    };
    
    // Formatar método de pagamento
    const formatPaymentMethod = (method) => {
      const methods = {
        'pix': 'PIX',
        'credit_card': 'Cartão de Crédito',
        'debit_card': 'Cartão de Débito',
        'boleto': 'Boleto Bancário',
        'appmax': 'Cartão de Crédito',
        'mercadopago': 'Mercado Pago',
      };
      return methods[method?.toLowerCase()] || method || 'PIX';
    };
    
    // Cores do Design System
    const colors = {
      primary: '#16A085',
      accent: '#2EAE9A',
      background: '#F7F9FA',
      card: '#FFFFFF',
      textPrimary: '#1A2E38',
      textSecondary: '#5C7080',
      border: '#D8DEE4',
      success: '#16A34A',
      muted: '#E8F8F5',
    };
    
    const { data, error } = await resend.emails.send({
      from: 'Gravador Médico <suporte@gravadormedico.com.br>',
      to: params.to,
      subject: '�️ Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Gravador Médico</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${colors.background}; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: ${colors.card}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -4px rgba(22, 160, 133, 0.15);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%); padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 30px; margin-bottom: 15px;">
                🎙️
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Bem-vindo ao Gravador Médico!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 15px;">Sua compra foi aprovada com sucesso ✨</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá, <strong>${params.customerName}</strong>! 👋
              </p>
              
              <p style="color: ${colors.textSecondary}; font-size: 15px; line-height: 1.7; margin: 0 0 30px 0;">
                Parabéns pela sua compra! Seu acesso ao <strong style="color: ${colors.textPrimary};">Gravador Médico</strong> já está liberado. Use as credenciais abaixo para fazer login:
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.muted}; border: 1px solid ${colors.border}; border-radius: 10px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="color: ${colors.primary}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0; font-weight: 700;">
                      🔐 Seus Dados de Acesso
                    </p>
                    
                    <div style="margin-bottom: 15px;">
                      <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 6px 0; font-weight: 500;">E-mail:</p>
                      <p style="color: ${colors.textPrimary}; font-size: 15px; font-weight: 600; margin: 0; font-family: monospace; background: ${colors.card}; padding: 12px 14px; border-radius: 8px; border: 1px solid ${colors.border};">
                        ${params.userEmail}
                      </p>
                    </div>
                    
                    <div>
                      <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 6px 0; font-weight: 500;">Senha Temporária:</p>
                      <p style="color: ${colors.textPrimary}; font-size: 15px; font-weight: 600; margin: 0; font-family: monospace; background: ${colors.card}; padding: 12px 14px; border-radius: 8px; border: 1px solid ${colors.border};">
                        ${params.userPassword}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://gravador-medico.lovable.app/login" style="display: inline-block; background-color: ${colors.primary}; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 160, 133, 0.35);">
                      Acessar o Sistema →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Order Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.background}; border-radius: 10px; border: 1px solid ${colors.border};">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 12px 0; font-weight: 500;">Detalhes da Compra:</p>
                    <table role="presentation" width="100%" cellpadding="6" cellspacing="0">
                      <tr>
                        <td style="color: ${colors.textSecondary}; font-size: 14px;">Produto:</td>
                        <td align="right" style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">Gravador Médico</td>
                      </tr>
                      <tr>
                        <td style="color: ${colors.textSecondary}; font-size: 14px;">Pedido:</td>
                        <td align="right" style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">#${formatOrderId(params.orderId)}</td>
                      </tr>
                      <tr>
                        <td style="color: ${colors.textSecondary}; font-size: 14px;">Valor:</td>
                        <td align="right" style="color: ${colors.success}; font-size: 14px; font-weight: 700;">R$ ${params.orderValue.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: ${colors.textSecondary}; font-size: 14px;">Pagamento:</td>
                        <td align="right" style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">${formatPaymentMethod(params.paymentMethod)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.background}; padding: 25px 30px; text-align: center; border-top: 1px solid ${colors.border};">
              <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 10px 0; line-height: 1.6;">
                Dúvidas? Responda este e-mail ou fale conosco no WhatsApp.
              </p>
              <p style="color: ${colors.textSecondary}; font-size: 12px; margin: 0; opacity: 0.8;">
                © 2026 Gravador Médico — Todos os direitos reservados
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    });
    
    if (error) {
      throw error;
    }
    
    // Salvar log no banco
    await supabase.from('email_logs').insert({
      email_id: data?.id,
      recipient_email: params.to,
      recipient_name: params.customerName,
      subject: '🎉 Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
      email_type: 'welcome',
      from_email: 'suporte@gravadormedico.com.br',
      from_name: 'Gravador Médico',
      order_id: params.orderId,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        user_email: params.userEmail,
        order_value: params.orderValue,
        payment_method: params.paymentMethod,
        reprocessed: true,
        script_version: '1.0'
      },
    });
    
    console.log(`  ✅ E-mail enviado com sucesso: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error(`  ❌ Erro ao enviar e-mail:`, error.message);
    
    // Salvar log de erro
    await supabase.from('email_logs').insert({
      recipient_email: params.to,
      recipient_name: params.customerName,
      subject: '🎉 Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
      email_type: 'welcome',
      from_email: 'suporte@gravadormedico.com.br',
      from_name: 'Gravador Médico',
      order_id: params.orderId,
      status: 'failed',
      error_message: error.message,
      metadata: {
        reprocessed: true,
        script_version: '1.0'
      },
    });
    
    return { success: false, error: error.message };
  }
}

// Função principal
async function main() {
  console.log('=====================================================');
  console.log('📧 REPROCESSAR E-MAILS PENDENTES');
  console.log('=====================================================\n');

  // 1. Buscar vendas pagas
  console.log('1️⃣ Buscando vendas pagas...');
  const { data: paidSales, error: salesError } = await supabase
    .from('sales')
    .select('id, customer_email, customer_name, total_amount, payment_method, created_at')
    .eq('order_status', 'paid')
    .order('created_at', { ascending: false });

  if (salesError) {
    console.error('❌ Erro ao buscar vendas:', salesError);
    process.exit(1);
  }

  // Adicionar Helcio Mattos manualmente
  const manualClients = [
    {
      id: 'manual-helcio-mattos',
      customer_email: 'helciodmtt@gmail.com',
      customer_name: 'Helcio Mattos',
      total_amount: 36.0,
      payment_method: 'pix'
    }
  ];

  const allSales = [...manualClients, ...paidSales];

  console.log(`   Encontradas ${paidSales.length} vendas pagas + ${manualClients.length} clientes manuais\n`);

  // 2. Buscar e-mails já enviados
  console.log('2️⃣ Verificando e-mails já enviados...');
  const { data: sentEmails } = await supabase
    .from('email_logs')
    .select('recipient_email')
    .eq('email_type', 'welcome')
    .eq('status', 'sent');

  const sentEmailSet = new Set(sentEmails?.map(e => e.recipient_email.toLowerCase()) || []);
  console.log(`   ${sentEmailSet.size} e-mails já enviados\n`);

  // 3. Filtrar vendas pendentes (sem e-mail enviado)
  const pendingSales = allSales.filter(sale => {
    const email = sale.customer_email?.toLowerCase();
    return email && !sentEmailSet.has(email);
  });

  // Remover duplicatas por e-mail (pegar a venda mais recente)
  const uniquePendingSales = [];
  const seenEmails = new Set();
  for (const sale of pendingSales) {
    const email = sale.customer_email?.toLowerCase();
    if (!seenEmails.has(email)) {
      seenEmails.add(email);
      uniquePendingSales.push(sale);
    }
  }

  console.log(`3️⃣ ${uniquePendingSales.length} clientes precisam receber e-mail:\n`);
  
  if (uniquePendingSales.length === 0) {
    console.log('✅ Nenhum e-mail pendente para processar!');
    process.exit(0);
  }

  uniquePendingSales.forEach((sale, i) => {
    console.log(`   ${i + 1}. ${sale.customer_name} <${sale.customer_email}> - R$ ${sale.total_amount}`);
  });
  console.log('');

  // 4. Processar cada cliente
  console.log('4️⃣ Processando clientes...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (const sale of uniquePendingSales) {
    console.log(`📌 Processando: ${sale.customer_name} <${sale.customer_email}>`);
    
    const password = generateSecurePassword();
    
    // Criar usuário no Lovable
    const userResult = await createLovableUser(
      sale.customer_email,
      password,
      sale.customer_name
    );
    
    if (!userResult.success && !userResult.alreadyExists) {
      console.log(`   ⚠️ Pulando e-mail pois falhou criação de usuário\n`);
      errorCount++;
      continue;
    }
    
    // Enviar e-mail
    const emailResult = await sendWelcomeEmail({
      to: sale.customer_email,
      customerName: sale.customer_name,
      userEmail: sale.customer_email,
      userPassword: password,
      orderId: sale.id,
      orderValue: sale.total_amount,
      paymentMethod: sale.payment_method
    });
    
    if (emailResult.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    console.log('');
    
    // Aguardar um pouco entre os e-mails para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Resumo final
  console.log('=====================================================');
  console.log('📊 RESUMO');
  console.log('=====================================================');
  console.log(`   ✅ Sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`   📧 Total processados: ${uniquePendingSales.length}`);
  console.log('=====================================================\n');
}

main().catch(console.error);
