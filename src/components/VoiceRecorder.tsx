'use client';

import { useRef, useState } from 'react';
import { Icon } from './Icon';
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
          setError('AI音声解析は無効です（GOOGLE_GENERATIVE_AI_API_KEY を設定してください）');
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
        className={`w-full rounded-xl py-4 px-5 transition-all active:scale-[0.98] disabled:opacity-50 ${
          recording
            ? 'bg-red-600 text-white shadow-sm'
            : processing
              ? 'bg-slate-200 text-slate-600'
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-center gap-2.5">
          {recording ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <span className="font-medium">録音中・タップで停止</span>
            </>
          ) : processing ? (
            <>
              <Icon.Sparkles className="w-4 h-4 animate-pulse" />
              <span className="font-medium">AIが解析しています...</span>
            </>
          ) : (
            <>
              <Icon.Mic className="w-5 h-5" />
              <span className="font-medium">音声で日報を入力</span>
            </>
          )}
        </div>
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-2 leading-relaxed">{error}</p>
      )}
    </div>
  );
}
