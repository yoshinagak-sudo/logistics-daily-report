import { NextRequest, NextResponse } from 'next/server';

// デモ用のCSV出力API
// 本番ではSupabaseから取得するが、デモではフロントから直接POSTもしくはこのエンドポイントは固定形式のテンプレを返す。
// ここではフロントが自分のlocalStorageからCSVを組み立てる方が一貫性があるため、最小実装として日付パラメータをエコーする。
// 実装は client側に委譲するが、フォールバックとして空テンプレを返す。

const HEADER = [
  '日付',
  'ドライバー',
  '車両',
  '出勤',
  '出庫',
  '帰庫',
  '退勤',
  '拘束時間(h)',
  '出庫メーター',
  '帰庫メーター',
  '走行距離(km)',
  '配送件数',
  '休憩回数',
  '給油',
  '高速利用',
  '異常件数',
  '異常重要度',
  '備考',
  '提出ステータス',
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || '';
  // デモモードではブラウザ側のlocalStorageに実データがあるため、
  // クライアントから POST で生データを送ってもらう実装に切り替えるべきだが、
  // ここでは最小ヘッダーCSVを返す（クライアントから直接ダウンロードする場合の保険）
  const csv = HEADER.join(',') + '\n';
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="daily_report_${date}.csv"`,
    },
  });
}

// クライアントがlocalStorageから組み立てたデータを送信してCSV化する
export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: Array<Record<string, string | number>> = body?.rows || [];
  const lines = [HEADER.join(',')];
  for (const r of rows) {
    const values = HEADER.map(h => {
      const v = (r as Record<string, unknown>)[h];
      if (v === undefined || v === null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
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
