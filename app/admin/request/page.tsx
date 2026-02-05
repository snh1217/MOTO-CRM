'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { strings } from '@/lib/strings.ko';

export default function AdminRequestPage() {
  const router = useRouter();
  const [centerName, setCenterName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRequestId(null);
    setSuccess(false);

    try {
      const response = await fetchWithTimeout(
        '/api/admin/requests',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ center_name: centerName, username, password })
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '요청에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setSuccess(true);
      setCenterName('');
      setUsername('');
      setPassword('');
    } catch (err) {
      setError('요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <header className="rounded-2xl bg-slate-900 px-6 py-5 text-white">
          <h1 className="text-2xl font-semibold">{strings.accountRequest.title}</h1>
          <p className="mt-2 text-sm text-slate-200">{strings.accountRequest.description}</p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              {strings.accountRequest.centerName}
              <input
                className="h-11 rounded-md border border-slate-200 px-3 text-sm"
                value={centerName}
                onChange={(event) => setCenterName(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {strings.accountRequest.username}
              <input
                className="h-11 rounded-md border border-slate-200 px-3 text-sm"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {strings.accountRequest.password}
              <input
                type="password"
                className="h-11 rounded-md border border-slate-200 px-3 text-sm"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && (
              <p className="text-sm text-red-500">
                {error}
                {requestId && <span className="ml-2 text-[11px]">requestId: {requestId}</span>}
              </p>
            )}
            {success && <p className="text-sm text-emerald-600">{strings.accountRequest.success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-md bg-slate-900 px-5 text-sm text-white disabled:opacity-50"
            >
              {loading ? strings.accountRequest.submitting : strings.accountRequest.submit}
            </button>
          </form>
        </section>

        <div className="text-sm text-slate-500">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="underline"
          >
            로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    </main>
  );
}
