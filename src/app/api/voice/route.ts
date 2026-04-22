import { NextRequest, NextResponse } from 'next/server';
import { extractReportFromAudio } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY が設定されていません', demo: true },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'audioファイルがありません' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'audio/webm';

    const result = await extractReportFromAudio(base64, mimeType);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[voice] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}
