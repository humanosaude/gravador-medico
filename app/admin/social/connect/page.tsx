'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Instagram, 
  Facebook, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Shield,
  Eye,
  BarChart3,
  Send,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const REQUIRED_PERMISSIONS = [
  { 
    name: 'instagram_basic', 
    description: 'Acessar informações do perfil',
    icon: Eye 
  },
  { 
    name: 'instagram_content_publish', 
    description: 'Publicar posts, Stories e Reels',
    icon: Send 
  },
  { 
    name: 'instagram_manage_insights', 
    description: 'Visualizar métricas e analytics',
    icon: BarChart3 
  },
  { 
    name: 'pages_read_engagement', 
    description: 'Ler engajamento das páginas',
    icon: Facebook 
  },
];

export default function InstagramConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Verificar se voltou do callback com sucesso ou erro
  useEffect(() => {
    const status = searchParams.get('status');
    const errorMsg = searchParams.get('error');
    
    if (status === 'success') {
      setSuccess(true);
      // Redirecionar para o dashboard após 2 segundos
      setTimeout(() => {
        router.push('/admin/social');
      }, 2000);
    } else if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
    }
  }, [searchParams, router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Buscar URL de login do backend
      const response = await fetch('/api/social/instagram/auth');
      const data = await response.json();

      if (data.authUrl) {
        // Redirecionar para o Facebook OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Não foi possível gerar URL de autenticação');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar conexão');
      setIsConnecting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101A1E]">
        <Card className="w-full max-w-md mx-4 bg-gray-800/50 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Conta conectada!
              </h2>
              <p className="text-gray-400">
                Sua conta Instagram foi conectada com sucesso ao InstaFlow.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecionando...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101A1E] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              InstaFlow
            </h1>
          </div>
          <p className="text-gray-400">
            Conecte sua conta Instagram Business para começar a automatizar
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro na conexão</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-white">
              <Facebook className="w-5 h-5 text-blue-500" />
              Conectar via Facebook
            </CardTitle>
            <CardDescription className="text-gray-400">
              O Instagram Business requer autenticação através do Facebook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Requisitos */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-400 mb-2">
                ⚠️ Antes de conectar, certifique-se de que:
              </h3>
              <ul className="text-sm text-yellow-400/80 space-y-1">
                <li>• Sua conta Instagram é do tipo <strong className="text-yellow-300">Business</strong> ou <strong className="text-yellow-300">Creator</strong></li>
                <li>• Está conectada a uma <strong className="text-yellow-300">Página do Facebook</strong></li>
                <li>• Você tem permissões de <strong className="text-yellow-300">administrador</strong> na página</li>
              </ul>
            </div>

            {/* Permissões */}
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Permissões solicitadas
              </h3>
              <div className="grid gap-3">
                {REQUIRED_PERMISSIONS.map((permission) => (
                  <div 
                    key={permission.name}
                    className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-700"
                  >
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <permission.icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">
                        {permission.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {permission.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-14 text-lg bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Facebook className="w-5 h-5 mr-2" />
                  Conectar com Facebook
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Help Link */}
            <p className="text-center text-sm text-gray-500">
              Precisa de ajuda?{' '}
              <a 
                href="https://help.instagram.com/502981923235522" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
              >
                Como converter para conta Business
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white">O que você poderá fazer:</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { emoji: '📅', title: 'Agendar Posts', desc: 'Feed, Stories e Reels' },
                { emoji: '🤖', title: 'Gerar Legendas', desc: 'Com IA personalizada' },
                { emoji: '📊', title: 'Ver Métricas', desc: 'Analytics completos' },
                { emoji: '🏷️', title: 'Sugerir Hashtags', desc: 'Baseado em performance' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <span className="text-2xl">{feature.emoji}</span>
                  <div>
                    <p className="font-medium text-white">
                      {feature.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
