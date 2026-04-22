'use client';

import { useRef, useState } from 'react';
import type { ExtractedReportFields } from '@/lib/types';

interface Props {
  onResult: (fields: ExtractedReportFields) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onResult, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await upload(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError('マイクが使用できません: ' + (err instanceof Error ? err.message : ''));
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function upload(blob: Blob) {
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'voice.webm');
      const res = await fetch('/api/voice', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.demo) {
          setError('デモ環境ではAI音声解析は無効です。GOOGLE_GENERATIVE_AI_API_KEY を設定してください。');
        } else {
          setError(data.error || '解析に失敗しました');
        }
        return;
      }
      onResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || processing}
        onClick={recording ? stop : start}
        className={`w-full rounded-xl border-2 p-4 transition-all active:scale-95 disabled:opacity-50 ${
          recording
            ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
            : 'bg-violet-600 border-violet-600 text-white hover:bg-violet-700'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{recording ? '⏹' : '🎤'}</span>
          <span className="font-bold">
            {processing ? 'AI解析中...' : recording ? '録音中（タップで停止）' : '音声で日報を入力'}
          </span>
        </div>
      </button>
      {error && (
        <p className="text-rose-600 text-xs mt-2 px-1">{error}</p>
      )}
      {!recording && !processing && !error && (
        <p className="text-slate-500 text-xs mt-2 px-1">
          例：「8時に出勤、8時半出庫、仙台市場に10時着、休憩12時から13時、5時10分帰庫、走行148km、異常なし」
        </p>
      )}
    </div>
  );
}
