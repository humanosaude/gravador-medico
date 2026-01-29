// ================================================================
// Mapeamento de nomes de contatos
// ================================================================
// Permite substituir nomes genéricos por nomes reais
// Adicione aqui qualquer nome que precise ser corrigido
// ================================================================

const CONTACT_NAME_OVERRIDES: Record<string, string> = {
  // ⚠️ REMOVIDO: 'Assistente Virtual' não deve mais ser mapeado para 'Helcio Mattos'
  // O problema de nomes incorretos foi corrigido no webhook que agora
  // não sobrescreve o push_name quando from_me=true
  // 
  // Adicione mais mapeamentos aqui se necessário:
  // 'Nome Errado': 'Nome Correto',
}

// 🚫 LISTA DE NOMES QUE DEVEM MOSTRAR O NÚMERO (nomes da instância/bot)
const BLOCKED_NAMES = [
  'gravador medico',
  'gravador médico',
  'gravadormedico',
  'assistente virtual',
  'bot',
  'atendimento',
  'suporte'
]

/**
 * Aplica mapeamento de nomes personalizados
 * Se o push_name estiver na lista de overrides, retorna o nome correto
 * Caso contrário, retorna o push_name ou formata o número
 * 
 * NOTA: Se push_name for um nome bloqueado (instância/bot),
 * usamos o número formatado ao invés
 */
export function getDisplayContactName(
  pushName?: string | null,
  remoteJid?: string
): string {
  // Se não tem push_name, formatar número
  if (!pushName) {
    return formatPhoneNumber(remoteJid || '')
  }
  
  // ⚠️ Se o nome está na lista de bloqueados, mostrar o número formatado
  // Isso evita que todos os contatos apareçam com o mesmo nome
  const normalizedName = pushName.toLowerCase().trim()
  if (BLOCKED_NAMES.includes(normalizedName)) {
    return formatPhoneNumber(remoteJid || '')
  }

  // Verificar se existe override para este nome
  if (pushName in CONTACT_NAME_OVERRIDES) {
    return CONTACT_NAME_OVERRIDES[pushName]
  }

  return pushName
}

/**
 * Formata número de telefone para exibição
 * Formato: (XX) XXXX-XXXX (8 dígitos) ou (XX) XXXXX-XXXX (9 dígitos)
 */
export function formatPhoneNumber(remoteJid: string): string {
  if (!remoteJid) return 'Cliente'
  
  // Remove @s.whatsapp.net ou @g.us
  const number = remoteJid.replace(/@s\.whatsapp\.net|@g\.us/g, '')
  
  // Se for número brasileiro (55), formatar
  if (number.startsWith('55') && number.length >= 12) {
    const ddd = number.substring(2, 4)
    const rest = number.substring(4)
    
    // Celular com 9 dígitos: (XX) XXXXX-XXXX
    if (rest.length === 9) {
      return `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`
    }
    
    // Fixo com 8 dígitos: (XX) XXXX-XXXX
    if (rest.length === 8) {
      return `(${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`
    }
    
    // Fallback para outros tamanhos
    return `(${ddd}) ${rest}`
  }
  
  return number
}
