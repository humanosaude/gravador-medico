"use client"

import { motion } from "framer-motion"
import { Copy, Check } from "lucide-react"
import { useState, useEffect } from "react"

interface ConfettiButtonProps {
  promptText: string
}

export default function ConfettiButton({ promptText }: ConfettiButtonProps) {
  const [copied, setCopied] = useState(false)
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string }>>([])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)

      // Generate confetti
      const newConfetti = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 200 - 100,
        y: Math.random() * -150 - 50,
        color: ["#3b82f6", "#8b5cf6", "#3D8B7E", "#f59e0b"][Math.floor(Math.random() * 4)],
      }))
      setConfetti(newConfetti)

      setTimeout(() => {
        setCopied(false)
        setConfetti([])
      }, 3000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="relative inline-block">
      {/* Confetti Particles */}
      {confetti.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
          }}
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full pointer-events-none"
          style={{ backgroundColor: particle.color }}
        />
      ))}

      {/* Button */}
      <motion.button
        onClick={handleCopy}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative px-8 py-4 rounded-2xl font-bold text-lg transition-all overflow-hidden ${
          copied
            ? "bg-brand-500 text-white shadow-lg shadow-brand-500/50"
            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50"
        }`}
      >
        {/* Shimmer Effect */}
        {!copied && (
          <motion.div
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        )}

        {/* Content */}
        <div className="relative flex items-center gap-3">
          {copied ? (
            <>
              <Check className="w-6 h-6" />
              <span>Copiado com Sucesso!</span>
            </>
          ) : (
            <>
              <Copy className="w-6 h-6" />
              <span>Copiar Prompt Mestre</span>
            </>
          )}
        </div>

        {/* Pulse Effect on Copy */}
        {copied && (
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 rounded-2xl bg-brand-500"
          />
        )}
      </motion.button>
    </div>
  )
}
