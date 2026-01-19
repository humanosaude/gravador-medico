"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Check,
  Trash2,
  ShoppingCart,
  Gift,
  ArrowRight,
  Plus,
  Minus,
  Shield,
  Zap,
  Star,
  Lock,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function CartPage() {
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<number[]>([])

  const toggleOrderBump = (index: number) => {
    setSelectedOrderBumps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  // Produtos principais no carrinho
  const mainProduct = {
    id: 1,
    title: "Método Gravador Médico Completo",
    description: "Sistema + 4 Bônus Exclusivos",
    price: 36,
    originalPrice: 938,
    image: "/images/gravador-medico.png", // Adicionar sua imagem
    quantity: 1,
  }

  // Order Bumps com espaço para mockups
  const orderBumps = [
    {
      id: 2,
      title: "🎯 Pacote VIP: Consultoria Personalizada",
      subtitle: "Economize 70% hoje",
      description: "30 minutos de consultoria individual para otimizar seu método + Setup completo feito por especialista + Suporte prioritário vitalício",
      originalPrice: 497,
      price: 147,
      discount: 70,
      highlight: "MAIS VENDIDO",
      badge: "LIMITADO",
      image: "/images/consultoria-vip.png", // Espaço para sua imagem/mockup
      features: [
        "Consultoria individual 1-on-1",
        "Setup personalizado completo",
        "Suporte prioritário vitalício",
        "Acesso ao grupo VIP",
      ],
    },
    {
      id: 3,
      title: "📚 Biblioteca Premium: 50+ Modelos Prontos",
      subtitle: "Economize horas de trabalho",
      description: "Modelos de prontuários para 20+ especialidades + Scripts de anamnese otimizados + Atualizações vitalícias + Prompts prontos para usar",
      originalPrice: 297,
      price: 97,
      discount: 67,
      highlight: "ECONOMIZE TEMPO",
      badge: "EXCLUSIVO",
      image: "/images/biblioteca-premium.png", // Espaço para sua imagem/mockup
      features: [
        "50+ modelos prontos",
        "20+ especialidades",
        "Scripts de anamnese",
        "Atualizações vitalícias",
      ],
    },
  ]

  const basePrice = mainProduct.price
  const orderBumpsTotal = selectedOrderBumps.reduce((acc, idx) => acc + orderBumps[idx].price, 0)
  const subtotal = basePrice + orderBumpsTotal
  const savings = mainProduct.originalPrice - mainProduct.price + 
    selectedOrderBumps.reduce((acc, idx) => acc + (orderBumps[idx].originalPrice - orderBumps[idx].price), 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <ShoppingCart className="w-4 h-4" />
            Revise seu Pedido
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2">
            Seu Carrinho
          </h1>
          <p className="text-gray-600 text-lg">
            Você economizará <strong className="text-brand-600">R$ {savings}</strong> nesta compra
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Products */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Product */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 border-2 border-brand-200"
            >
              <div className="flex items-start gap-6">
                {/* Product Image */}
                <div className="flex-shrink-0 w-32 h-32 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center overflow-hidden">
                  {/* Substitua pelo seu mockup real */}
                  <div className="text-white text-center p-4">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-2" />
                    <div className="text-xs font-bold">GRAVADOR<br/>MÉDICO</div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 mb-1">
                        {mainProduct.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {mainProduct.description}
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="text-gray-400 line-through text-sm">
                        R$ {mainProduct.originalPrice}
                      </span>
                      <span className="text-3xl font-black text-brand-600">
                        R$ {mainProduct.price}
                      </span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                        -96%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                    {[
                      "Acesso Imediato",
                      "4 Bônus Inclusos",
                      "Garantia 7 Dias",
                      "Suporte 30 Dias",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Order Bumps Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-orange-500" />
                <h2 className="text-2xl font-black text-gray-900">
                  Aproveite Essas Ofertas Especiais
                </h2>
              </div>
              <p className="text-gray-600">
                Adicione ao seu pedido agora e economize ainda mais
              </p>

              {orderBumps.map((bump, index) => (
                <motion.div
                  key={bump.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <button
                    onClick={() => toggleOrderBump(index)}
                    className={`w-full text-left transition-all ${
                      selectedOrderBumps.includes(index)
                        ? "bg-gradient-to-br from-brand-50 to-brand-50 border-2 border-brand-500 shadow-xl ring-4 ring-brand-200"
                        : "bg-white border-2 border-gray-200 hover:border-brand-300 shadow-md hover:shadow-lg"
                    } rounded-2xl overflow-hidden`}
                  >
                    <div className="p-6">
                      {/* Badge de destaque */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                            selectedOrderBumps.includes(index)
                              ? "bg-brand-600 border-brand-600 scale-110"
                              : "border-gray-300 bg-white"
                          }`}>
                            {selectedOrderBumps.includes(index) && (
                              <Check className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">
                            <Zap className="w-3 h-3" />
                            {bump.highlight}
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                          {bump.badge}
                        </div>
                      </div>

                      <div className="flex gap-6">
                        {/* Mockup Image */}
                        <div className="flex-shrink-0 w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-200">
                          {/* ESPAÇO PARA SEU MOCKUP - Adicione sua imagem aqui */}
                          <div className="text-center p-4">
                            <Gift className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                            <div className="text-xs text-gray-500 font-medium">
                              Adicione seu<br/>mockup aqui
                            </div>
                          </div>
                          {/* Exemplo de como usar imagem real:
                          <Image
                            src={bump.image}
                            alt={bump.title}
                            width={160}
                            height={160}
                            className="object-cover"
                          />
                          */}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="mb-3">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {bump.title}
                            </h3>
                            <p className="text-sm font-semibold text-brand-600">
                              {bump.subtitle}
                            </p>
                          </div>

                          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                            {bump.description}
                          </p>

                          {/* Features */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                            {bump.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                                <Check className="w-3 h-3 text-brand-600 flex-shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 line-through text-sm">
                              De R$ {bump.originalPrice}
                            </span>
                            <span className="text-2xl font-black text-brand-600">
                              R$ {bump.price}
                            </span>
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                              -{bump.discount}%
                            </span>
                          </div>

                          {selectedOrderBumps.includes(index) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="mt-3 pt-3 border-t border-brand-200"
                            >
                              <div className="flex items-center gap-2 text-sm text-brand-700 font-bold">
                                <Check className="w-4 h-4" />
                                Adicionado ao seu pedido
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              {[
                { icon: Shield, text: "Compra Segura" },
                { icon: Lock, text: "Dados Protegidos" },
                { icon: Check, text: "Garantia 7 Dias" },
                { icon: Zap, text: "Acesso Imediato" },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <badge.icon className="w-5 h-5 text-brand-600" />
                  <span className="font-medium">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200"
              >
                <h3 className="text-xl font-black text-gray-900 mb-6">
                  Resumo do Pedido
                </h3>

                <div className="space-y-4 mb-6">
                  {/* Main Product */}
                  <div className="flex justify-between text-gray-700">
                    <span>Método Completo</span>
                    <span className="font-bold">R$ {basePrice}</span>
                  </div>

                  {/* Order Bumps */}
                  {selectedOrderBumps.map((idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-600">
                      <span className="flex-1 pr-2">
                        {orderBumps[idx].title.split(":")[0]}
                      </span>
                      <span className="font-bold text-brand-600">
                        +R$ {orderBumps[idx].price}
                      </span>
                    </div>
                  ))}

                  {/* Savings */}
                  {savings > 0 && (
                    <div className="flex justify-between text-brand-600 font-bold pt-3 border-t border-gray-200">
                      <span>Você está economizando</span>
                      <span>R$ {savings}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-baseline">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <div className="text-right">
                      <div className="text-4xl font-black text-brand-600">
                        R$ {subtotal}
                      </div>
                      <div className="text-xs text-gray-500">ou 12x de R$ {(subtotal / 12).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <Link href="/checkout">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative group mb-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-gradient-to-r from-brand-600 to-brand-600 text-white px-6 py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2">
                      IR PARA PAGAMENTO
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </motion.button>
                </Link>

                <p className="text-xs text-center text-gray-500">
                  🔒 Pagamento 100% seguro
                </p>
              </motion.div>

              {/* Guarantee */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 bg-brand-50 border-2 border-brand-200 rounded-xl p-4 text-center"
              >
                <Shield className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                <div className="font-bold text-brand-900 mb-1">
                  Garantia de 7 Dias
                </div>
                <p className="text-xs text-brand-700">
                  100% do seu dinheiro de volta se não gostar
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-gray-600">
                  <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 border-2 border-white flex items-center justify-center"
                >
                  <Star className="w-5 h-5 text-white fill-white" />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium">
              <strong className="text-brand-600">+284 médicos</strong> compraram hoje
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
