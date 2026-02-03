import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

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
          body: JSON.stringify({ identifier, password })
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || 'Login failed.');
        setRequestId(result.requestId || null);
        return;
      }
      router.replace('/admin/home');
    } catch (err) {
      setError('Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Center Login</h2>
      <p className="mt-1 text-sm text-slate-500">Use your admin account to access your center.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          Email or Username
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            className="rounded-md border border-slate-200 px-3 py-2"
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
          className="rounded-md bg-slate-900 px-5 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
