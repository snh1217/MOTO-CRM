import AdminLoginForm from '@/components/AdminLoginForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="rounded-2xl bg-slate-900 px-6 py-5 text-white">
          <h1 className="text-2xl font-semibold">MOTO-CRM</h1>
          <p className="mt-2 text-sm text-slate-200">Center admin sign in</p>
        </header>
        <AdminLoginForm />
      </div>
    </main>
  );
}
