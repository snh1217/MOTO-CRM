import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { strings } from '@/lib/strings.ko';

export default function AdminLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetchWithTimeout(
        '/api/admin/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '로그인에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      router.replace('/admin/home');
    } catch (err) {
      setError('로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{strings.login.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{strings.login.subtitle}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          {strings.login.identifier}
          <input
            className="h-11 rounded-md border border-slate-200 px-3 text-sm"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {strings.login.password}
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
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-md bg-slate-900 px-5 text-sm text-white disabled:opacity-50"
        >
          {loading ? strings.login.submitting : strings.login.submit}
        </button>
      </form>
    </section>
  );
}
