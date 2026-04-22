import { NextRequest, NextResponse } from 'next/server';
import { summarizeReports } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY が設定されていません', demo: true },
        { status: 503 }
      );
    }

    const body = await req.json();
    const reports = Array.isArray(body?.reports) ? body.reports : [];
    const summary = await summarizeReports(reports);
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[summary] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}
