'use client';

import { useRef, useState } from 'react';
import type { OdometerOCRResult } from '@/lib/types';

interface Props {
  label: string;
  current: number | null;
  onConfirm: (value: number) => void;
}

export function OdometerCapture({ label, current, onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OdometerOCRResult | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.demo) {
          setError('デモ環境ではAI画像解析は無効です。直接入力してください。');
        } else {
          setError(data.error || 'OCRに失敗しました');
        }
        return;
      }
      setOcrResult(data);
      setEditValue(data.value !== null ? String(data.value) : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown');
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function confirm() {
    const v = Number(editValue);
    if (!Number.isFinite(v) || v <= 0) {
      setError('有効な数字を入力してください');
      return;
    }
    onConfirm(v);
    setOcrResult(null);
    setEditValue('');
  }

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-lg font-bold tabular-nums">
          {current !== null ? current.toLocaleString() + ' km' : '--'}
        </span>
      </div>

      {!ocrResult && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
            className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {processing ? '解析中...' : '📷 撮影してOCR'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              const v = window.prompt(`${label}の走行距離を入力してください（km）`, current ? String(current) : '');
              if (v) {
                const n = Number(v.replace(/[^0-9]/g, ''));
                if (Number.isFinite(n) && n > 0) onConfirm(n);
              }
            }}
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 text-sm font-medium"
          >
            ✏️
          </button>
        </div>
      )}

      {ocrResult && (
        <div className="space-y-2">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <div className="text-xs text-blue-700 mb-1">AI読取結果（信頼度: {Math.round(ocrResult.confidence * 100)}%）</div>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full text-2xl font-bold tabular-nums bg-white border border-blue-300 rounded px-3 py-2"
              placeholder="数字を入力"
            />
            {ocrResult.notes && <p className="text-xs text-slate-500 mt-1">{ocrResult.notes}</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirm}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-bold"
            >
              この値で登録
            </button>
            <button
              type="button"
              onClick={() => { setOcrResult(null); setEditValue(''); }}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 text-sm"
            >
              再撮影
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-rose-600 text-xs mt-2">{error}</p>}
    </div>
  );
}
