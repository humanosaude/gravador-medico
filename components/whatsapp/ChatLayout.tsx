// ================================================================
// WhatsApp Chat Layout - Container Principal
// ================================================================

'use client'

import { useState } from 'react'
import type { WhatsAppConversation } from '@/lib/types/whatsapp'

interface ChatLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
}

export default function ChatLayout({ children, sidebar }: ChatLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-5.5rem)] bg-[#111b21] overflow-hidden">
      {/* Sidebar de conversas */}
      <div className="w-[350px] bg-[#111b21] border-r border-gray-800 flex flex-col overflow-hidden">
        {sidebar}
      </div>

      {/* Área principal de mensagens */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
