#!/usr/bin/env node
// Script para resetar senha no Lovable e enviar email de teste

const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

const LOVABLE_URL = process.env.NEXT_PUBLIC_LOVABLE_EDGE_FUNCTION_URL;
const API_SECRET = 'webhook-appmax-2026-secure-key';

// Cores do Design System
const colors = {
  primary: '#16A085',
  accent: '#2EAE9A',
  background: '#F7F9FA',
  card: '#FFFFFF',
  textPrimary: '#1A2E38',
  textSecondary: '#5C7080',
  border: '#D8DEE4',
  muted: '#E8F8F5',
};

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

async function main() {
  const email = 'helciodmtt@gmail.com';
  const name = 'Helcio Mattos';
  
  console.log('=====================================================');
  console.log('📧 EMAIL DE TESTE COM SENHA SINCRONIZADA');
  console.log('=====================================================\n');
  
  // 1. Buscar usuário no Lovable
  console.log('1️⃣ Buscando usuário no Lovable...');
  
  const listResponse = await fetch(LOVABLE_URL, {
    method: 'GET',
    headers: {
      'x-api-secret': API_SECRET,
      'Content-Type': 'application/json',
    },
  });
  
  const listData = await listResponse.json();
  const user = listData.users?.find(u => u.email === email);
  
  if (!user) {
    console.log('❌ Usuário não encontrado no Lovable');
    return;
  }
  
  console.log(`   ✅ Usuário encontrado: ${user.id}`);
  
  // 2. Gerar nova senha
  const newPassword = generateSecurePassword();
  console.log(`\n2️⃣ Gerando nova senha: ${newPassword}`);
  
  // 3. Resetar senha no Lovable
  console.log('\n3️⃣ Resetando senha no Lovable...');
  
  const resetResponse = await fetch(LOVABLE_URL, {
    method: 'PUT',
    headers: {
      'x-api-secret': API_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: user.id,
      newPassword: newPassword,
    }),
  });
  
  const resetData = await resetResponse.json();
  
  if (!resetResponse.ok) {
    console.log('❌ Erro ao resetar senha:', resetData);
    return;
  }
  
  console.log('   ✅ Senha resetada com sucesso!');
  
  // 4. Enviar email
  console.log('\n4️⃣ Enviando email...');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Gravador Médico <suporte@gravadormedico.com.br>',
      to: email,
      subject: '🎙️ Gravador Médico - Seus Dados de Acesso',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${colors.background}; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${colors.card}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%); padding: 50px 40px; text-align: center;">
              <div style="margin-bottom: 20px;">
                <span style="font-size: 40px;">🎙️</span>
              </div>
              <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700;">Bem-vindo ao Gravador Médico!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">Sua compra foi aprovada com sucesso</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: ${colors.textPrimary}; font-size: 17px; line-height: 1.6; margin: 0 0 24px 0;">
                Olá <strong>${name}</strong>,
              </p>
              
              <p style="color: ${colors.textSecondary}; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">
                Parabéns pela sua compra! Seu acesso ao <strong style="color: ${colors.primary};">Gravador Médico</strong> está pronto. 
                Use as credenciais abaixo para acessar o sistema.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.muted}; border-radius: 12px; border: 1px solid ${colors.border}; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 28px;">
                    <p style="color: ${colors.primary}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 20px 0;">
                      🔐 Seus Dados de Acesso
                    </p>

                    <div style="margin-bottom: 16px;">
                      <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 6px 0;">E-mail:</p>
                      <p style="background-color: ${colors.card}; color: ${colors.textPrimary}; font-size: 15px; font-family: monospace; font-weight: 600; margin: 0; padding: 12px 16px; border-radius: 8px; border: 1px solid ${colors.border};">
                        ${email}
                      </p>
                    </div>

                    <div>
                      <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 6px 0;">Senha:</p>
                      <p style="background-color: ${colors.card}; color: ${colors.textPrimary}; font-size: 15px; font-family: monospace; font-weight: 600; margin: 0; padding: 12px 16px; border-radius: 8px; border: 1px solid ${colors.border};">
                        ${newPassword}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="https://gravador-medico.lovable.app/login" style="display: inline-block; background-color: ${colors.primary}; color: #FFFFFF; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(22, 160, 133, 0.4);">
                      Acessar o Sistema →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Order Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.background}; border-radius: 8px; border: 1px solid ${colors.border};">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 12px 0; font-weight: 600;">Detalhes do Pedido:</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: ${colors.textSecondary}; font-size: 14px;">Produto:</span>
                        </td>
                        <td style="padding-bottom: 8px; text-align: right;">
                          <span style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">Gravador Médico</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: ${colors.textSecondary}; font-size: 14px;">Pedido:</span>
                        </td>
                        <td style="padding-bottom: 8px; text-align: right;">
                          <span style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">#TESTE2801</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: ${colors.textSecondary}; font-size: 14px;">Valor:</span>
                        </td>
                        <td style="padding-bottom: 8px; text-align: right;">
                          <span style="color: ${colors.primary}; font-size: 14px; font-weight: 700;">R$ 36.00</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="color: ${colors.textSecondary}; font-size: 14px;">Pagamento:</span>
                        </td>
                        <td style="text-align: right;">
                          <span style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">PIX</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.background}; padding: 24px 40px; border-top: 1px solid ${colors.border};">
              <p style="color: ${colors.textSecondary}; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
                Dúvidas? Responda este e-mail ou acesse nosso suporte.
              </p>
              <p style="color: ${colors.textSecondary}; font-size: 12px; margin: 0; text-align: center;">
                © 2026 Gravador Médico - Todos os direitos reservados
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });
    
    if (error) {
      console.error('❌ Erro ao enviar email:', error);
      return;
    }
    
    console.log('   ✅ Email enviado com sucesso!');
    console.log(`   📧 ID: ${data?.id}`);
    
    console.log('\n=====================================================');
    console.log('✅ CONCLUÍDO!');
    console.log('=====================================================');
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Senha: ${newPassword}`);
    console.log('\n⚠️  A senha acima está SINCRONIZADA com o Lovable!');
    console.log('   Você pode fazer login com essas credenciais.');
    console.log('=====================================================\n');
    
  } catch (err) {
    console.error('❌ Erro crítico:', err);
  }
}

main();
