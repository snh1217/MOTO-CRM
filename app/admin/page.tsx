'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

export default function AdminLoginPage() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error || result.message || '인증에 실패했습니다.');
      return;
    }

    router.replace('/admin/receipts');
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">어드민 코드 입력</h2>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            코드
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          {message && <p className="text-sm text-red-500">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-slate-900 px-5 py-2 text-white disabled:opacity-50"
          >
            {loading ? '인증 중...' : '인증하기'}
          </button>
        </form>
      </section>
    </main>
  );
}
