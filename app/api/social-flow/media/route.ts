/**
 * Social Flow - Media Upload API
 * Upload e gerenciamento de mídia para posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { createClient } from '@supabase/supabase-js';
import { SocialNetwork } from '@/lib/social-flow/types';
import { getNetworkConfig } from '@/lib/social-flow/config';

async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
    const { payload } = await jose.jwtVerify(token, secret);
    
    return payload as { id: string; email: string };
  } catch {
    return null;
  }
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/social-flow/media - Upload de mídia
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const network = formData.get('network') as SocialNetwork;
    const postType = formData.get('postType') as string || 'feed';
    const postId = formData.get('postId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validar arquivo
    const validation = await validateMediaFile(file, network, postType);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${user.id}/${network || 'general'}/${timestamp}_${sanitizedName}`;

    // Upload para Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('social-media')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('social-media')
      .getPublicUrl(fileName);

    const publicUrl = urlData?.publicUrl;

    // Extrair metadados
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    const dimensions = await getMediaDimensions(file);

    // Se postId fornecido, adicionar ao post
    let mediaItem = null;
    if (postId) {
      // Verificar se o post pertence ao usuário
      const { data: post } = await supabase
        .from('social_posts')
        .select('id, social_accounts!inner (user_id)')
        .eq('id', postId)
        .eq('social_accounts.user_id', user.id)
        .single();

      if (post) {
        // Contar mídia existente para order_index
        const { count } = await supabase
          .from('social_media_items')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        const { data: insertedMedia } = await supabase
          .from('social_media_items')
          .insert({
            post_id: postId,
            file_type: mediaType,
            public_url: publicUrl,
            storage_path: fileName,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type,
            width: dimensions?.width,
            height: dimensions?.height,
            order_index: count || 0,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        mediaItem = insertedMedia;
      }
    }

    return NextResponse.json({
      success: true,
      media: {
        id: mediaItem?.id,
        url: publicUrl,
        storagePath: fileName,
        type: mediaType,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
        width: dimensions?.width,
        height: dimensions?.height,
      },
      validation: {
        isOptimal: validation.isOptimal,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
      },
    });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload media' },
      { status: 500 }
    );
  }
}

// DELETE /api/social-flow/media - Deletar mídia
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    const storagePath = searchParams.get('storagePath');

    if (!mediaId && !storagePath) {
      return NextResponse.json(
        { error: 'mediaId or storagePath is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    let pathToDelete = storagePath;

    if (mediaId) {
      // Buscar mídia e verificar ownership
      const { data: media } = await supabase
        .from('social_media_items')
        .select(`
          *,
          social_posts!inner (
            social_accounts!inner (
              user_id
            )
          )
        `)
        .eq('id', mediaId)
        .eq('social_posts.social_accounts.user_id', user.id)
        .single();

      if (!media) {
        return NextResponse.json(
          { error: 'Media not found' },
          { status: 404 }
        );
      }

      pathToDelete = media.storage_path;

      // Deletar registro
      await supabase
        .from('social_media_items')
        .delete()
        .eq('id', mediaId);
    }

    // Deletar arquivo do storage
    if (pathToDelete) {
      await supabase.storage
        .from('social-media')
        .remove([pathToDelete]);
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error: any) {
    console.error('Media delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete media' },
      { status: 500 }
    );
  }
}

// Helpers

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, any>;
  isOptimal?: boolean;
  warnings?: string[];
  suggestions?: string[];
}

async function validateMediaFile(
  file: File,
  network?: SocialNetwork,
  postType?: string
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validações gerais
  const maxSize = 100 * 1024 * 1024; // 100MB geral
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large',
      details: { maxSize, actualSize: file.size },
    };
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported',
      details: { allowedTypes, actualType: file.type },
    };
  }

  // Validações específicas da rede
  if (network) {
    const config = getNetworkConfig(network);

    if (config) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      // Verificar tipo de post e limites
      const postTypeConfig = config.postTypes?.find((pt) => pt.id === postType);
      
      if (postTypeConfig) {
        // Verificar tipos de mídia permitidos
        if (isVideo && !postTypeConfig.allowedMediaTypes?.includes('video')) {
          return {
            valid: false,
            error: `Videos not supported for ${postType} on ${network}`,
          };
        }

        if (isImage && !postTypeConfig.allowedMediaTypes?.includes('image')) {
          return {
            valid: false,
            error: `Images not supported for ${postType} on ${network}`,
          };
        }

        // Verificar tamanho máximo
        const maxSizeMB = postTypeConfig.maxFileSizeMB || 100;
        if (file.size > maxSizeMB * 1024 * 1024) {
          return {
            valid: false,
            error: `File too large for ${network} ${postType}`,
            details: { maxSizeMB, actualSizeMB: Math.round(file.size / (1024 * 1024)) },
          };
        }

        // Sugestões de otimização
        if (postTypeConfig.aspectRatios?.length) {
          suggestions.push(
            `Recommended aspect ratios for ${network} ${postType}: ${postTypeConfig.aspectRatios.join(', ')}`
          );
        }

        if (isVideo && postTypeConfig.maxDurationSeconds) {
          suggestions.push(
            `Maximum video duration for ${network} ${postType}: ${postTypeConfig.maxDurationSeconds}s`
          );
        }
      }
    }
  }

  // Warnings específicos por tipo de post
  if (postType === 'reel' && !file.type.startsWith('video/')) {
    warnings.push('Reels require video content');
  }

  if (postType === 'story') {
    if (file.type.startsWith('video/') && file.size > 30 * 1024 * 1024) {
      warnings.push('Story videos should be under 30MB for best performance');
    }
  }

  return {
    valid: true,
    isOptimal: warnings.length === 0,
    warnings,
    suggestions,
  };
}

async function getMediaDimensions(
  file: File
): Promise<{ width?: number; height?: number } | null> {
  // Para o servidor, não podemos usar Image/Video diretamente
  // Em produção, isso seria feito com sharp ou ffprobe
  // Por agora, retornamos null e deixamos para o cliente
  return null;
}
