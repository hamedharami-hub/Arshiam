import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">صفحه مورد نظر یافت نشد</h2>
      <p className="text-slate-400 mb-6">صفحه‌ای که به دنبال آن هستید وجود ندارد.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium text-sm"
      >
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
