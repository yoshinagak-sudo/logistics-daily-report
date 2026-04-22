import { NextRequest, NextResponse } from 'next/server';

// クライアントが組み立てたデータを受け取りCSV化
export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: Array<Record<string, string | number>> = body?.rows || [];

  // 最初の行から動的にヘッダー生成
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const lines = [headers.map(escapeCSV).join(',')];
  for (const r of rows) {
    const values = headers.map(h => {
      const v = (r as Record<string, unknown>)[h];
      return escapeCSV(v === undefined || v === null ? '' : String(v));
    });
    lines.push(values.join(','));
  }
  const csv = '﻿' + lines.join('\n'); // BOM付きでExcel互換
  const date = body?.date || 'export';
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="daily_report_${date}.csv"`,
    },
  });
}

function escapeCSV(s: string): string {
  const v = s.replace(/"/g, '""');
  return /[",\n]/.test(v) ? `"${v}"` : v;
}
