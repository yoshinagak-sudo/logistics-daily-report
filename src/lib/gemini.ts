import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedReportFields, OdometerOCRResult } from './types';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey && process.env.NODE_ENV !== 'test') {
  console.warn('[gemini] GOOGLE_GENERATIVE_AI_API_KEY が設定されていません');
}

const genAI = new GoogleGenerativeAI(apiKey || 'dummy');

const FLASH_MODEL = 'gemini-2.5-flash';

// 音声 → テキスト + 日報項目抽出（マルチモーダルで一発処理）
export async function extractReportFromAudio(
  audioBase64: string,
  mimeType: string
): Promise<ExtractedReportFields> {
  const model = genAI.getGenerativeModel({
    model: FLASH_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
あなたは物流会社の運行日報入力アシスタントです。
配送員の音声から、日報に必要な情報を抽出してJSONで返してください。

抽出ルール:
- 時刻は "HH:MM" 形式（24時間）
- メーター値・距離・件数は整数
- 配送先・休憩・異常はそれぞれ複数あれば配列で
- 異常のcategory: vehicle/delay/accident/damage/near_miss/other
- 異常のseverity: low/medium/high（事故・破損は medium 以上）
- 言及がない項目は省略してOK
- raw_text には文字起こしした原文を入れる

JSONスキーマ:
{
  "clock_in_time": "HH:MM",
  "depart_time": "HH:MM",
  "return_time": "HH:MM",
  "clock_out_time": "HH:MM",
  "odometer_start": 整数,
  "odometer_end": 整数,
  "total_distance_km": 整数,
  "delivery_count": 整数,
  "deliveries": [{"destination":"配送先名","arrived_time":"HH:MM","completed_time":"HH:MM","notes":"備考"}],
  "breaks": [{"start_time":"HH:MM","end_time":"HH:MM"}],
  "anomalies": [{"category":"...","severity":"...","description":"内容"}],
  "refueled": true|false,
  "used_highway": true|false,
  "notes": "備考全文",
  "raw_text": "音声の文字起こし全文"
}

このJSONのみを返してください。コードブロックや説明文は不要です。
`.trim();

  const result = await model.generateContent([
    { inlineData: { data: audioBase64, mimeType } },
    { text: prompt },
  ]);

  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    // JSONパース失敗時は raw_text のみで返す
    return { raw_text: text };
  }
}

// メーター画像 → OCR
export async function extractOdometerFromImage(
  imageBase64: string,
  mimeType: string
): Promise<OdometerOCRResult> {
  const model = genAI.getGenerativeModel({
    model: FLASH_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
車両の走行距離メーター画像から数字を読み取ってください。
注意:
- メインのオドメーター（総走行距離）の数字を返す
- トリップメーターと混同しない
- カンマ・小数点は無視して整数で返す
- 読み取れない場合は value: null

JSONスキーマ:
{
  "value": 整数 or null,
  "confidence": 0.0〜1.0,
  "raw_text": "画像から読み取った数字文字列",
  "notes": "補足（読み取りにくい場合の理由など）"
}

このJSONのみを返してください。
`.trim();

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    { text: prompt },
  ]);

  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { value: null, confidence: 0, raw_text: text };
  }
}

// 日報リストから管理者向け要約生成
export async function summarizeReports(
  reports: Array<{ driver_name: string; notes?: string | null; anomalies?: string[] }>
): Promise<string> {
  if (reports.length === 0) return '本日の日報はありません。';

  const model = genAI.getGenerativeModel({
    model: FLASH_MODEL,
  });

  const reportsJson = JSON.stringify(reports, null, 2);
  const prompt = `
あなたは物流会社の管理者向けアシスタントです。
本日提出された日報を整理し、管理者が把握すべき重要事項を要約してください。

形式:
- 「車両異常」「遅延」「ヒヤリハット」「その他特記」のセクション
- 該当事項がないセクションは省略
- 各項目1行、誰が何を報告したかを明記
- 全体で200文字以内

日報データ:
${reportsJson}
`.trim();

  const result = await model.generateContent(prompt);
  return result.response.text();
}
