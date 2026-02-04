/**
 * InstaFlow - Approval API
 */

import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending_approval';

  const supabase = supabaseAdmin;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Buscar posts com status específico
  let query = supabase
    .from('instaflow_scheduled_posts')
    .select(`
      *,
      instagram_accounts!inner(
        id,
        username,
        profile_picture_url
      )
    `)
    .order('scheduled_for', { ascending: true });

  if (status !== 'all') {
    query = query.eq('status', status);
  } else {
    query = query.in('status', ['pending_approval', 'approved', 'rejected', 'changes_requested']);
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Formatar dados para o frontend
  const formattedPosts = (posts || []).map((post: any) => ({
    id: post.id,
    account: {
      username: post.instagram_accounts.username,
      profile_picture_url: post.instagram_accounts.profile_picture_url,
    },
    content_type: post.content_type,
    caption: post.caption,
    hashtags: post.hashtags,
    media_urls: post.media_urls,
    scheduled_for: post.scheduled_for,
    created_at: post.created_at,
    status: post.status,
    comments: post.approval_comments || [],
    created_by: post.created_by || {},
  }));

  return NextResponse.json({ posts: formattedPosts });
}

export async function POST(request: Request) {
  const supabase = supabaseAdmin;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { postId, action, comment } = body;

  if (!postId || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Mapear ação para status
  const statusMap: Record<string, string> = {
    approve: 'scheduled', // Aprovado = volta para scheduled (pronto para publicar)
    reject: 'rejected',
    request_changes: 'changes_requested',
  };

  const newStatus = statusMap[action];
  if (!newStatus) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Buscar post atual para pegar comentários existentes
  const { data: currentPost } = await supabase
    .from('instaflow_scheduled_posts')
    .select('approval_comments')
    .eq('id', postId)
    .single();

  const existingComments = currentPost?.approval_comments || [];

  // Adicionar comentário de ação
  const newComment = {
    id: crypto.randomUUID(),
    user: user.email || 'Revisor',
    message: comment || `Post ${action === 'approve' ? 'aprovado' : action === 'reject' ? 'rejeitado' : 'requer alterações'}`,
    action,
    created_at: new Date().toISOString(),
  };

  // Atualizar post
  const { error: updateError } = await supabase
    .from('instaflow_scheduled_posts')
    .update({
      status: newStatus,
      approval_comments: [...existingComments, newComment],
      approved_by: action === 'approve' ? user.id : null,
      approved_at: action === 'approve' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (updateError) {
    console.error('Error updating post:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Registrar ação no log
  await supabase.from('instaflow_activity_log').insert({
    user_id: user.id,
    action: `post_${action}`,
    details: { post_id: postId, comment },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, newStatus });
}
