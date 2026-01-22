/**
 * Gerenciamento de Links Rastreáveis
 * Página para CRUD de tracking links
 * URL: /admin/tracking/links
 */

'use client';

import { useEffect, useState } from 'react';
import { 
  createTrackingLink, 
  updateTrackingLink, 
  deleteTrackingLink, 
  getTrackingLinks 
} from '@/actions/tracking';
import { TrackingLink, TrackingLinkInsert } from '@/lib/types/tracking';
import { generateSlug } from '@/lib/tracking-utils';
import { 
  Link2, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink,
  MousePointerClick,
  TrendingUp,
  Power,
  PowerOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

export default function TrackingLinksPage() {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<TrackingLink | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    campaign_name: '',
    whatsapp_number: '',
    whatsapp_message: '',
    destination_url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
  });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id';
      const result = await getTrackingLinks(userId);
      if (result.success && result.links) {
        setLinks(result.links as TrackingLink[]);
      }
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      toast('Falha ao carregar links rastreáveis', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (link?: TrackingLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        slug: link.slug,
        campaign_name: link.campaign_name || '',
        whatsapp_number: link.whatsapp_number,
        whatsapp_message: link.whatsapp_message,
        destination_url: link.destination_url,
        utm_source: link.utm_source || '',
        utm_medium: link.utm_medium || '',
        utm_campaign: link.utm_campaign || '',
        utm_content: link.utm_content || '',
        utm_term: link.utm_term || '',
      });
    } else {
      setEditingLink(null);
      setFormData({
        slug: '',
        campaign_name: '',
        whatsapp_number: '',
        whatsapp_message: '',
        destination_url: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_content: '',
        utm_term: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLink(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id';

      if (editingLink) {
        // Atualizar link existente
        const result = await updateTrackingLink(editingLink.id, formData);
        if (result.success) {
          toast('Link atualizado com sucesso!', 'success');
          loadLinks();
          handleCloseModal();
        } else {
          throw new Error(result.error);
        }
      } else {
        // Criar novo link
        const linkData: TrackingLinkInsert = {
          ...formData,
          user_id: userId,
        };
        const result = await createTrackingLink(linkData);
        if (result.success) {
          toast('Link criado com sucesso!', 'success');
          loadLinks();
          handleCloseModal();
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error: any) {
      toast(error.message || 'Falha ao salvar link', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este link?')) {
      return;
    }

    try {
      const result = await deleteTrackingLink(id);
      if (result.success) {
        toast('Link deletado com sucesso!', 'success');
        loadLinks();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast(error.message || 'Falha ao deletar link', 'error');
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(url);
    toast('Link copiado para a área de transferência!', 'success');
  };

  const handleGenerateSlug = () => {
    if (formData.campaign_name) {
      const slug = generateSlug(formData.campaign_name);
      setFormData({ ...formData, slug });
    }
  };

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-10 bg-zinc-800 rounded w-64 mb-2"></div>
            <div className="h-6 bg-zinc-800 rounded w-96"></div>
          </div>
          <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-zinc-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Links Rastreáveis
          </h1>
          <p className="text-gray-400 mt-2">
            Crie e gerencie links de rastreamento para suas campanhas
          </p>
        </div>
        
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Link
        </Button>
      </div>

      {/* Lista de Links */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Carregando links...</p>
        </div>
      ) : links.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-12 text-center">
            <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhum link criado ainda
            </h3>
            <p className="text-gray-400 mb-6">
              Crie seu primeiro link rastreável para começar
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card key={link.id} className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-white">
                      {link.campaign_name || link.slug}
                      {link.is_active ? (
                        <Power className="w-4 h-4 text-green-400" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-gray-400" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      /r/{link.slug}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(link.slug)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/r/${link.slug}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(link)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* WhatsApp Info */}
                  <div>
                    <p className="text-sm font-medium text-gray-300">WhatsApp:</p>
                    <p className="text-sm text-gray-400">{link.whatsapp_number}</p>
                    <p className="text-sm text-gray-500 italic mt-1">
                      "{link.whatsapp_message.substring(0, 100)}..."
                    </p>
                  </div>

                  {/* UTM Parameters */}
                  {(link.utm_source || link.utm_medium || link.utm_campaign) && (
                    <div className="flex gap-2 flex-wrap">
                      {link.utm_source && (
                        <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-600/30">
                          source: {link.utm_source}
                        </span>
                      )}
                      {link.utm_medium && (
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded border border-green-600/30">
                          medium: {link.utm_medium}
                        </span>
                      )}
                      {link.utm_campaign && (
                        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded border border-purple-600/30">
                          campaign: {link.utm_campaign}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-6 pt-3 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">
                        {(link as any).clicks?.length || 0} cliques
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">
                        0 conversões
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingLink ? 'Editar Link' : 'Criar Novo Link'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure seu link rastreável com mensagem personalizada do WhatsApp
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome da Campanha */}
            <div>
              <Label htmlFor="campaign_name">Nome da Campanha *</Label>
              <Input
                id="campaign_name"
                value={formData.campaign_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, campaign_name: e.target.value })}
                onBlur={handleGenerateSlug}
                placeholder="Ex: Promoção Janeiro 2026"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="slug">Slug (URL Curta) *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="promo-jan"
                    required
                    disabled={!!editingLink}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {window.location.origin}/r/{formData.slug || '...'}
                  </p>
                </div>
                {!editingLink && (
                  <Button type="button" variant="outline" onClick={handleGenerateSlug}>
                    Gerar
                  </Button>
                )}
              </div>
            </div>

            {/* WhatsApp Number */}
            <div>
              <Label htmlFor="whatsapp_number">Número do WhatsApp *</Label>
              <Input
                id="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                placeholder="5511999999999"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Formato: 55 + DDD + número (sem espaços ou caracteres especiais)
              </p>
            </div>

            {/* WhatsApp Message */}
            <div>
              <Label htmlFor="whatsapp_message">Mensagem Pré-preenchida *</Label>
              <Textarea
                id="whatsapp_message"
                value={formData.whatsapp_message}
                onChange={(e) => setFormData({ ...formData, whatsapp_message: e.target.value })}
                placeholder="Olá! Gostaria de saber mais sobre..."
                rows={4}
                required
              />
            </div>

            {/* Destination URL */}
            <div>
              <Label htmlFor="destination_url">URL de Destino</Label>
              <Input
                id="destination_url"
                type="url"
                value={formData.destination_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, destination_url: e.target.value })}
                placeholder="https://seusite.com/oferta"
              />
              <p className="text-xs text-gray-400 mt-1">
                Opcional: Link alternativo para visitantes
              </p>
            </div>

            {/* UTM Parameters */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-medium text-white mb-3">Parâmetros UTM (Opcional)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="utm_source">Source</Label>
                  <Input
                    id="utm_source"
                    value={formData.utm_source}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, utm_source: e.target.value })}
                    placeholder="facebook"
                  />
                </div>
                <div>
                  <Label htmlFor="utm_medium">Medium</Label>
                  <Input
                    id="utm_medium"
                    value={formData.utm_medium}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, utm_medium: e.target.value })}
                    placeholder="cpc"
                  />
                </div>
                <div>
                  <Label htmlFor="utm_campaign">Campaign</Label>
                  <Input
                    id="utm_campaign"
                    value={formData.utm_campaign}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, utm_campaign: e.target.value })}
                    placeholder="promo-janeiro"
                  />
                </div>
                <div>
                  <Label htmlFor="utm_content">Content</Label>
                  <Input
                    id="utm_content"
                    value={formData.utm_content}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, utm_content: e.target.value })}
                    placeholder="banner-topo"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingLink ? 'Atualizar' : 'Criar'} Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
