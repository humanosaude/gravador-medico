// Script temporário para testar o novo template de email
const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

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

async function sendTest() {
  console.log('📧 Enviando e-mail de teste com novo design...');
  
  const { data, error } = await resend.emails.send({
    from: 'Gravador Médico <suporte@gravadormedico.com.br>',
    to: 'helciodmtt@gmail.com',
    subject: 'Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${colors.background}; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: ${colors.card}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -4px rgba(22, 160, 133, 0.15);">
          
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%); padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 30px; margin-bottom: 15px;">🎙️</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Bem-vindo ao Gravador Médico!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 15px;">Sua compra foi aprovada com sucesso ✨</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá, <strong>Helcio Mattos</strong>! 👋
              </p>
              
              <p style="color: ${colors.textSecondary}; font-size: 15px; line-height: 1.7; margin: 0 0 30px 0;">
                Este é um e-mail de teste com o <strong style="color: ${colors.textPrimary};">novo design system</strong>. As cores agora combinam com a identidade visual do Gravador Médico!
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.muted}; border: 1px solid ${colors.border}; border-radius: 10px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="color: ${colors.primary}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0; font-weight: 700;">
                      🔐 Seus Dados de Acesso
                    </p>
                    
                    <div style="margin-bottom: 15px;">
                      <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 6px 0; font-weight: 500;">E-mail:</p>
                      <p style="color: ${colors.textPrimary}; font-size: 15px; font-weight: 600; margin: 0; font-family: monospace; background: ${colors.card}; padding: 12px 14px; border-radius: 8px; border: 1px solid ${colors.border};">
                        helciodmtt@gmail.com
                      </p>
                    </div>
                    
                    <div>
                      <p style="color: ${colors.textSecondary}; font-size: 13px; margin: 0 0 6px 0; font-weight: 500;">Senha Temporária:</p>
                      <p style="color: ${colors.textPrimary}; font-size: 15px; font-weight: 600; margin: 0; font-family: monospace; background: ${colors.card}; padding: 12px 14px; border-radius: 8px; border: 1px solid ${colors.border};">
                        TesteSenha@2026
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://gravador-medico.lovable.app/login" style="display: inline-block; background-color: ${colors.primary}; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 160, 133, 0.35);">
                      Acessar o Sistema →
                    </a>
                  </td>
                </tr>
              </table>
              
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
                        <td align="right" style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">#TESTE123</td>
                      </tr>
                      <tr>
                        <td style="color: ${colors.textSecondary}; font-size: 14px;">Valor:</td>
                        <td align="right" style="color: ${colors.success}; font-size: 14px; font-weight: 700;">R$ 36,00</td>
                      </tr>
                      <tr>
                        <td style="color: ${colors.textSecondary}; font-size: 14px;">Pagamento:</td>
                        <td align="right" style="color: ${colors.textPrimary}; font-size: 14px; font-weight: 600;">PIX</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
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
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ E-mail enviado com sucesso:', data.id);
  }
}

sendTest();
