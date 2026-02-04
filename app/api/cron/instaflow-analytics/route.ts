/**
 * InstaFlow - Cron Job: Analytics Fetcher
 */

import { NextResponse } from 'next/server';
import { handleAnalyticsCron } from '@/lib/workers/analytics-fetcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  const result = await handleAnalyticsCron(authHeader || undefined);

  if (!result.success) {
    return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 500 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
