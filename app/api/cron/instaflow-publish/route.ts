/**
 * InstaFlow - Cron Jobs API Routes
 * 
 * Endpoints para serem chamados pelo Vercel Cron ou serviço similar
 */

import { NextResponse } from 'next/server';
import { handleCronRequest } from '@/lib/workers/publish-scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  const result = await handleCronRequest(authHeader || undefined);

  if (!result.success) {
    return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 500 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
