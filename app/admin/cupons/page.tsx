'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, X, Calendar, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Coupon, CouponFormData } from '@/lib/types/coupon'
import { toast } from 'sonner'

export default function CuponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    type: 'percent',
    value: 0,
    min_order_value: 0,
    usage_limit: null,
    expiration_date: null,
    description: '',
    is_active: true,
  })

  // Carregar cupons
  const loadCoupons = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/coupons')
      if (!response.ok) throw new Error('Erro ao carregar cupons')
      const data = await response.json()
      setCoupons(data)
    } catch (error) {
      toast.error('Erro ao carregar cupons')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  // Abrir dialog para criar/editar
  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon)
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        min_order_value: coupon.min_order_value,
        usage_limit: coupon.usage_limit,
        expiration_date: coupon.expiration_date,
        description: coupon.description || '',
        is_active: coupon.is_active,
      })
    } else {
      setEditingCoupon(null)
      setFormData({
        code: '',
        type: 'percent',
        value: 0,
        min_order_value: 0,
        usage_limit: null,
        expiration_date: null,
        description: '',
        is_active: true,
      })
    }
    setDialogOpen(true)
  }

  // Salvar cupom (criar ou editar)
  const handleSave = async () => {
    try {
      const url = editingCoupon
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons'
      
      const method = editingCoupon ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar cupom')
      }

      toast.success(editingCoupon ? 'Cupom atualizado!' : 'Cupom criado!')
      setDialogOpen(false)
      loadCoupons()
    } catch (error: any) {
      toast.error(error.message)
      console.error(error)
    }
  }

  // Deletar cupom (soft delete)
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar este cupom?')) return

    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erro ao deletar cupom')

      toast.success('Cupom desativado!')
      loadCoupons()
    } catch (error) {
      toast.error('Erro ao deletar cupom')
      console.error(error)
    }
  }

  // Formatar data
  const formatDate = (date: string | null) => {
    if (!date) return 'Sem expiração'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Calcular estatísticas
  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.is_active).length,
    totalUsage: coupons.reduce((acc, c) => acc + c.usage_count, 0),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">
              Gerenciar Cupons 🎟️
            </h1>
            <p className="text-gray-400 mt-1">
              Crie e gerencie cupons de desconto para seus clientes
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cupom
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gray-900/50 border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de Cupons</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gray-900/50 border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Cupons Ativos</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gray-900/50 border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de Usos</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsage}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="p-6 bg-gray-900/50 border-gray-800">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-400">Carregando cupons...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Nenhum cupom cadastrado ainda.</p>
              <Button
                onClick={() => handleOpenDialog()}
                className="mt-4 bg-brand-600 hover:bg-brand-700"
              >
                Criar Primeiro Cupom
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-gray-800/50">
                  <TableHead className="text-gray-300">Código</TableHead>
                  <TableHead className="text-gray-300">Tipo</TableHead>
                  <TableHead className="text-gray-300">Valor</TableHead>
                  <TableHead className="text-gray-300">Usos</TableHead>
                  <TableHead className="text-gray-300">Expira em</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-right text-gray-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="border-gray-800 hover:bg-gray-800/30">
                    <TableCell className="font-mono font-bold text-white">
                      {coupon.code}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                        {coupon.type === 'percent' ? 'Porcentagem' : 'Fixo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {coupon.type === 'percent'
                        ? `${coupon.value}%`
                        : `R$ ${coupon.value.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <span className="font-semibold text-white">{coupon.usage_count}</span>
                      {coupon.usage_limit && (
                        <span className="text-gray-500"> / {coupon.usage_limit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {formatDate(coupon.expiration_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.is_active ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-800 text-gray-400 border-gray-700">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(coupon)}
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coupon.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingCoupon
                ? 'Atualize as informações do cupom'
                : 'Preencha os dados para criar um novo cupom'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Código */}
            <div>
              <Label htmlFor="code" className="text-gray-300">Código do Cupom *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="EX: PROMO20"
                className="font-mono bg-gray-800 border-gray-700 text-white"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                Será convertido automaticamente para MAIÚSCULAS
              </p>
            </div>

            {/* Tipo e Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type" className="text-gray-300">Tipo *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'percent' | 'fixed',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white"
                >
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="value" className="text-gray-300">
                  Valor * ({formData.type === 'percent' ? '%' : 'R$'})
                </Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  max={formData.type === 'percent' ? 100 : undefined}
                  step="0.01"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            {/* Valor Mínimo */}
            <div>
              <Label htmlFor="min_order_value" className="text-gray-300">Valor Mínimo do Pedido (R$)</Label>
              <Input
                id="min_order_value"
                type="number"
                value={formData.min_order_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_order_value: parseFloat(e.target.value) || 0,
                  })
                }
                min="0"
                step="0.01"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Limite de Uso */}
            <div>
              <Label htmlFor="usage_limit" className="text-gray-300">Limite de Uso (deixe vazio para ilimitado)</Label>
              <Input
                id="usage_limit"
                type="number"
                value={formData.usage_limit || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usage_limit: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                min="1"
                placeholder="Ilimitado"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Data de Expiração */}
            <div>
              <Label htmlFor="expiration_date" className="text-gray-300">Data de Expiração</Label>
              <Input
                id="expiration_date"
                type="datetime-local"
                value={
                  formData.expiration_date
                    ? new Date(formData.expiration_date).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiration_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="description" className="text-gray-300">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrição interna do cupom"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer text-gray-300">
                Cupom ativo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-brand-600 hover:bg-brand-700">
              {editingCoupon ? 'Atualizar' : 'Criar'} Cupom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
