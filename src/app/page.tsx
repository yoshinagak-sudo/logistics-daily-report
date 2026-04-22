import Link from 'next/link';
import { Icon } from '@/components/Icon';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <span className="font-semibold tracking-tight text-slate-900">物流AI日報</span>
          <span className="ml-2 text-xs text-slate-400">/ AI Daily Report</span>
        </div>
      </header>

      <section className="flex-1 flex flex-col">
        <div className="max-w-5xl w-full mx-auto px-6 pt-20 pb-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-blue-600 tracking-wider uppercase mb-3">For logistics teams</p>
            <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight leading-[1.1] mb-5">
              話す、撮る、確認する。<br />
              それだけで、日報が完成する。
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              ドライバーは3分で入力、管理者はリアルタイムで把握。
              音声入力とメーターOCRで、紙やExcelの日報を完全に置き換えます。
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3 max-w-3xl">
            <Link
              href="/driver"
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-900 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Icon.Truck className="w-5 h-5" />
                </div>
                <Icon.ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-semibold text-slate-900 mb-1">ドライバー画面</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                出退勤、配送、休憩、車両点検、異常報告まで。スマホで完結します。
              </p>
            </Link>

            <Link
              href="/admin"
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-900 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Icon.Chart className="w-5 h-5" />
                </div>
                <Icon.ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="font-semibold text-slate-900 mb-1">管理ダッシュボード</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                提出状況、異常報告、AI要約、CSV出力。すべて1画面で。
              </p>
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white mt-auto">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="grid md:grid-cols-3 gap-x-10 gap-y-6">
              <Feature title="AI音声入力">
                話した内容をAIが日報項目に自動分類。出庫から異常報告までまとめて入力できます。
              </Feature>
              <Feature title="メーターOCR">
                走行距離メーターを撮影するだけで自動読み取り。手入力ミスを防ぎます。
              </Feature>
              <Feature title="リアルタイム把握">
                管理者は提出状況・異常・労務リスクをダッシュボードで即時確認。
              </Feature>
              <Feature title="AI要約">
                日報内容をAIが200文字に要約。管理者の確認負荷を大幅に削減します。
              </Feature>
              <Feature title="未提出アラート">
                提出忘れを自動検知。LINE/メールで通知できます（拡張）。
              </Feature>
              <Feature title="CSV出力">
                請求・労務・車両管理に二次活用できる構造化データを出力。
              </Feature>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-500">
            <span>デモモード（データはブラウザに保存）</span>
            <span>© 物流AI日報</span>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-1 h-4 bg-blue-600 rounded-full" />
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed pl-3">{children}</p>
    </div>
  );
}
