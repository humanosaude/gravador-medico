"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Copy,
  Edit,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ProductSyncButton } from '@/components/ProductSyncButton'

interface ProductPerformance {
  total_sales: number
  total_revenue: number
  refund_rate: number
  conversion_rate: number
  health_score: number
  unique_customers: number
  last_sale_at: string
}

interface Product {
  id: string
  external_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  category: string
  plan_type?: string
  is_active: boolean
  is_featured: boolean
  checkout_url?: string
  performance?: ProductPerformance
}

interface Stats {
  total_products: number
  active_products: number
  total_revenue: number
  avg_health_score: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, categoryFilter, products])

  const loadProducts = async () => {
    try {
      setLoading(true)
      
      // Buscar produtos
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Erro ao carregar produtos:', error)
        return
      }

      // Buscar performance de cada produto via view
      const { data: performanceData } = await supabase
        .from('product_performance')
        .select('*')

      // Combinar dados
      const productsWithPerformance = (productsData || []).map(product => {
        const perf = performanceData?.find(p => p.product_name === product.name)
        return {
          ...product,
          performance: perf || null
        }
      })

      setProducts(productsWithPerformance)
      
      // Calcular stats
      calculateStats(productsWithPerformance)

    } catch (error) {
      console.error('❌ Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (productList: Product[]) => {
    const stats = {
      total_products: productList.length,
      active_products: productList.filter(p => p.is_active).length,
      total_revenue: productList.reduce((sum, p) => sum + (p.performance?.total_revenue || 0), 0),
      avg_health_score: productList.length 
        ? Math.round(productList.reduce((sum, p) => sum + (p.performance?.health_score || 0), 0) / productList.length)
        : 0
    }
    setStats(stats)
  }

  const filterProducts = () => {
    let filtered = [...products]

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }

    setFilteredProducts(filtered)
  }

  const copyCheckoutLink = (url?: string) => {
    if (!url) {
      alert('Link não configurado')
      return
    }
    navigator.clipboard.writeText(url)
    alert('✅ Link copiado!')
  }

  const toggleActive = async (productId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !currentStatus })
      .eq('id', productId)

    if (!error) {
      loadProducts()
    }
  }

  const getRefundBadgeColor = (rate: number) => {
    if (rate < 1) return "bg-green-500/20 text-green-400 border-green-500/30"
    if (rate < 5) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    return "bg-red-500/20 text-red-400 border-red-500/30"
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 50) return "text-yellow-400"
    return "text-red-400"
  }

  // Produto com maior reembolso
  const worstProduct = products.reduce((prev, current) => {
    const prevRate = prev.performance?.refund_rate || 0
    const currRate = current.performance?.refund_rate || 0
    return currRate > prevRate ? current : prev
  }, products[0])

  // Produto mais vendido
  const bestProduct = products.reduce((prev, current) => {
    const prevRevenue = prev.performance?.total_revenue || 0
    const currRevenue = current.performance?.total_revenue || 0
    return currRevenue > prevRevenue ? current : prev
  }, products[0])

  const MetricCard = ({ title, value, icon: Icon, color, prefix = '', suffix = '', highlight = false }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl shadow-xl p-6 border ${
        highlight 
          ? 'bg-gradient-to-br border-opacity-30' 
          : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
      } ${color}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${highlight ? 'bg-white/10' : 'bg-gradient-to-br'} ${!highlight && color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-gray-300 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-white'}`}>
            {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', {
              minimumFractionDigits: prefix === 'R$ ' ? 2 : 0,
              maximumFractionDigits: prefix === 'R$ ' ? 2 : 0,
            }) : value}{suffix}
          </p>
        </div>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Carregando produtos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Inteligência de Produtos
          </h1>
          <p className="text-gray-400 mt-1">Performance e saúde financeira por SKU</p>
        </div>
        
        <ProductSyncButton onSyncComplete={loadProducts} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Produto Mais Vendido */}
        <MetricCard
          title="🏆 Mais Vendido"
          value={bestProduct?.name?.substring(0, 20) || '-'}
          icon={TrendingUp}
          color="from-green-500 to-emerald-600"
          highlight
        />

        {/* Produto com Maior Reembolso */}
        <MetricCard
          title="⚠️ Maior Reembolso"
          value={`${worstProduct?.performance?.refund_rate?.toFixed(1) || '0'}%`}
          icon={AlertTriangle}
          color="from-red-500 to-rose-600"
          highlight
        />

        {/* Ticket Médio Global */}
        <MetricCard
          title="💰 Ticket Médio"
          value={stats?.total_revenue && stats?.total_products 
            ? stats.total_revenue / stats.total_products 
            : 0
          }
          icon={DollarSign}
          color="from-blue-500 to-cyan-600"
          prefix="R$ "
        />

        {/* Health Score Médio */}
        <MetricCard
          title="📊 Health Score"
          value={`${stats?.avg_health_score || 0}/100`}
          icon={Package}
          color="from-purple-500 to-fuchsia-600"
        />
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="🔍 Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todas Categorias</option>
            <option value="subscription">Assinaturas</option>
            <option value="one_time">Compra Única</option>
            <option value="upsell">Upsells</option>
            <option value="auto-detected">Auto-descobertos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Produto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Preço</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Vendas (30d)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Receita</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Taxa Reembolso</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Conversão</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Health</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-700/30 transition-colors">
                  {/* Produto */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.plan_type || product.category}</div>
                      </div>
                    </div>
                  </td>

                  {/* Preço */}
                  <td className="px-6 py-4 text-gray-300 font-medium">
                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Vendas */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-semibold">
                        {product.performance?.total_sales || 0}
                      </span>
                    </div>
                  </td>

                  {/* Receita */}
                  <td className="px-6 py-4">
                    <div className="text-green-400 font-bold">
                      R$ {product.performance?.total_revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </div>
                  </td>

                  {/* Taxa de Reembolso */}
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRefundBadgeColor(product.performance?.refund_rate || 0)}`}>
                      {product.performance?.refund_rate?.toFixed(1) || '0'}%
                    </span>
                  </td>

                  {/* Conversão */}
                  <td className="px-6 py-4 text-gray-300 font-medium">
                    {product.performance?.conversion_rate?.toFixed(1) || '0'}%
                  </td>

                  {/* Health Score */}
                  <td className="px-6 py-4">
                    <div className={`font-bold text-lg ${getHealthColor(product.performance?.health_score || 0)}`}>
                      {product.performance?.health_score || 0}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(product.id, product.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        product.is_active 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {product.is_active ? (
                        <><CheckCircle2 className="w-3 h-3 inline mr-1" /> Ativo</>
                      ) : (
                        <><XCircle className="w-3 h-3 inline mr-1" /> Inativo</>
                      )}
                    </button>
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => copyCheckoutLink(product.checkout_url)}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                        title="Copiar link do checkout"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                        title="Editar produto"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Clique em "Sincronizar" para descobrir produtos das vendas'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
