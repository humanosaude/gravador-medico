/**
 * InstaFlow - Cron Job: Best Times Calculator
 */

import { NextResponse } from 'next/server';
import { handleBestTimesCron } from '@/lib/workers/best-times-calculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180; // 3 minutos

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  const result = await handleBestTimesCron(authHeader || undefined);

  if (!result.success) {
    return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 500 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
