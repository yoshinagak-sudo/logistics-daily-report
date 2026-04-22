import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
            AI運行日報アシスト
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            物流AI日報
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            ドライバーは「話す・撮る・確認する」だけ。<br />
            管理者はリアルタイムで運行・異常・労務リスクを把握できます。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/driver"
            className="group bg-white rounded-2xl border border-slate-200 p-8 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                🚚
              </div>
              <span className="text-sm text-slate-400 group-hover:text-blue-500">→</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">ドライバー画面</h2>
            <p className="text-slate-600 text-sm">
              出退勤の記録、配送実績、音声入力、メーター撮影など。スマホで3分で日報完成。
            </p>
          </Link>

          <Link
            href="/admin"
            className="group bg-white rounded-2xl border border-slate-200 p-8 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">
                📊
              </div>
              <span className="text-sm text-slate-400 group-hover:text-blue-500">→</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">管理者ダッシュボード</h2>
            <p className="text-slate-600 text-sm">
              当日の日報一覧、未提出者、異常報告を一目で把握。AI要約とCSV出力に対応。
            </p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-3">主な機能</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <Feature icon="🎤" title="音声入力">
              話すだけでAIが日報項目に自動分類
            </Feature>
            <Feature icon="📷" title="メーターOCR">
              撮影するだけで走行距離を自動計算
            </Feature>
            <Feature icon="⚠️" title="異常即時通知">
              事故・遅延・車両異常を管理者へ即座に共有
            </Feature>
            <Feature icon="📝" title="AI要約">
              管理者向けに重要事項を200字で要約
            </Feature>
            <Feature icon="📋" title="未提出アラート">
              提出忘れを自動検知して通知
            </Feature>
            <Feature icon="📤" title="CSV出力">
              請求・労務・車両管理に二次活用
            </Feature>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          デモモードで動作中。データはブラウザに保存されます。
        </p>
      </div>
    </main>
  );
}

function Feature({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="font-semibold text-slate-900">{title}</span>
      </div>
      <p className="text-slate-600 text-xs leading-relaxed">{children}</p>
    </div>
  );
}
