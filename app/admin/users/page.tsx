'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { strings } from '@/lib/strings.ko';

type Center = {
  id: string;
  name: string;
  code: string;
};

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  center_id: string;
  is_active: boolean;
  created_at: string;
  centers?: { name: string; code: string } | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setRequestId(null);

    try {
      const [usersRes, centersRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/centers', { credentials: 'include' })
      ]);

      if (usersRes.status === 401 || centersRes.status === 401) {
        router.replace('/');
        return;
      }

      const usersResult = await usersRes.json().catch(() => ({}));
      const centersResult = await centersRes.json().catch(() => ({}));

      if (!usersRes.ok) {
        setError(usersResult.error || usersResult.message || '사용자 조회에 실패했습니다.');
        setRequestId(usersResult.requestId || null);
        return;
      }

      if (!centersRes.ok) {
        setError(centersResult.error || centersResult.message || '센터 조회에 실패했습니다.');
        setRequestId(centersResult.requestId || null);
        return;
      }

      setUsers(usersResult.data || []);
      setCenters(centersResult.data || []);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetchWithTimeout(
        '/api/admin/users',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formEmail,
            username: formUsername,
            password: formPassword
          }),
          credentials: 'include'
        },
        12000
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '사용자 생성에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }

      setUsers((prev) => [result.data, ...prev]);
      setFormEmail('');
      setFormUsername('');
      setFormPassword('');
    } catch (err) {
      setError('사용자 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{strings.adminUsers.title}</h2>
          <p className="text-sm text-slate-500">{strings.adminUsers.description}</p>
        </div>

        <form onSubmit={handleCreate} className="mt-6 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            {strings.adminUsers.email}
            <input
              className="h-11 rounded-md border border-slate-200 px-3"
              value={formEmail}
              onChange={(event) => setFormEmail(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {strings.adminUsers.username}
            <input
              className="h-11 rounded-md border border-slate-200 px-3"
              value={formUsername}
              onChange={(event) => setFormUsername(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {strings.adminUsers.password}
            <input
              type="password"
              className="h-11 rounded-md border border-slate-200 px-3"
              value={formPassword}
              onChange={(event) => setFormPassword(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {strings.adminUsers.center}
            <select className="h-11 rounded-md border border-slate-200 px-3" disabled>
              {centers.length === 0 && <option>불러오는 중...</option>}
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name} ({center.code})
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-md bg-slate-900 px-4 text-sm text-white disabled:opacity-60"
            >
              {saving ? strings.adminUsers.creating : strings.adminUsers.create}
            </button>
            {error && (
              <p className="text-xs text-red-500">
                {error}
                {requestId && <span className="ml-2">requestId: {requestId}</span>}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold">{strings.adminUsers.listTitle}</h3>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">{strings.common.loading}</p>
        ) : (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="font-semibold">{user.email || user.username || '이름 없음'}</p>
                  <p className="text-xs text-slate-500">{user.centers?.name || '센터'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(user.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse text-sm">
                <thead className="border-b border-slate-200 text-left">
                  <tr>
                    <th className="py-2 pr-4">이메일</th>
                    <th className="py-2 pr-4">사용자명</th>
                    <th className="py-2 pr-4">센터</th>
                    <th className="py-2 pr-4">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{user.email || '-'}</td>
                      <td className="py-2 pr-4">{user.username || '-'}</td>
                      <td className="py-2 pr-4">{user.centers?.name || '-'}</td>
                      <td className="py-2 pr-4">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
