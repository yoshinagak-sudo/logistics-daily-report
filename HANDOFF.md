# 物流日報AIアプリ - 引き継ぎ

最終更新: 2026-04-22

## プロジェクト概要
物流会社向けに外販する「AI運行日報アプリ」。ドライバーは「話す・撮る・確認する」だけで日報を完成、管理者はリアルタイムで運行・異常・労務リスクを把握できる。

## 現在の状態
- Next.js 16.2.4 (App Router) + TypeScript + Tailwind 初期化済み
- Supabase Client / Gemini SDK / zod / date-fns インストール済み
- **デモモード（localStorage）でフル機能が動作**（Supabase未接続でも全画面が動く）
- ドライバー画面: 出退勤・配送・休憩・音声入力・メーターOCR・異常報告・提出 すべて実装
- 管理者ダッシュボード: 一覧・サマリー・AI要約・詳細モーダル・CSV出力 すべて実装
- API Routes: /api/voice, /api/ocr, /api/summary, /api/csv 実装済み
- ビルド成功（型エラーなし）

## 直近の決定事項
- **AI構成**: Gemini 2.5 Flash 単独（音声→テキスト+項目分類、メーターOCR、伝票OCR、要約まで）
  - 理由: コスト最適化（月$30〜50想定、ドライバー30人×20日）
- **DB/Storage**: Supabase（無料枠開始、Auth・Storage・PostgreSQL一括）
- **デプロイ**: Vercel
- **対象**: 取引先の物流会社向け（自社利用ではなく外販前段階）
- **MVPスコープ**: 日報入力 + 管理者一覧 + CSV出力 + 音声入力 + メーターOCR

## 次の一手
1. Supabaseプロジェクト作成（ユーザー作業 or 後で指示）
2. DBスキーマ設計（drivers, vehicles, daily_reports, deliveries, vehicle_inspections, anomalies）
3. 環境変数設定（.env.local）
4. ドライバー画面の基本UI実装
5. 音声入力 → Gemini分類フロー実装
6. メーターOCR → Gemini Vision フロー実装
7. 管理者ダッシュボード
8. CSV出力
9. Vercelデプロイ

## 未解決の課題・ハマりどころ
- **Supabase認証情報未設定**: `.env.local` に `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` が必要
- **Gemini API Key 未設定**: `GOOGLE_GENERATIVE_AI_API_KEY` が必要
- **音声録音の権限**: iOS Safari は HTTPS 必須、localhost は OK だが本番は Vercel HTTPS で動作確認必要
- **メーターOCR精度**: 数字確定はユーザー確認ステップを必ず挟む（誤認識による距離間違いを防ぐ）
- 古い実装 `/Desktop/system-dev/音声入力配送日報/` は無視（2026年2月の使い捨てプロト、日本語パスでビルドエラー懸念）

## 想定ランニングコスト
| 項目 | 金額 |
|---|---|
| Vercel | 無料枠（Hobby） |
| Supabase | 無料枠（DB 500MB / Storage 1GB / 月50,000 MAU） |
| Gemini 2.5 Flash | 30人×20日稼働で月 $30〜50 |

## 重要なコマンド
- 開発サーバー: `npm run dev`（http://localhost:3000）
- ビルド: `npm run build`
- デプロイ: `vercel --prod`

## 関連
- 旧プロト（参考のみ、日本語パスのため捨てる）: `/Users/butaifarm/Desktop/system-dev/音声入力配送日報/`
- Notionプロジェクト管理DB: 登録予定
