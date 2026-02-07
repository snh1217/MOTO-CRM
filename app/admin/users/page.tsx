'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  is_superadmin?: boolean;
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
  const [actionId, setActionId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [centerFilter, setCenterFilter] = useState('');

  const centerOptions = useMemo(() => centers, [centers]);

  const loadMe = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/me', { credentials: 'include' });
      if (!response.ok) {
        return;
      }
      const result = await response.json().catch(() => ({}));
      setIsSuperAdmin(Boolean(result.data?.is_superadmin));
    } catch (err) {
      setIsSuperAdmin(false);
    }
  }, []);

  const loadData = useCallback(async (superAdminFlag: boolean) => {
    setLoading(true);
    setError(null);
    setRequestId(null);

    try {
      const [usersRes, centersRes] = await Promise.all([
        fetch(
          superAdminFlag
            ? `/api/admin/users?all=1${centerFilter ? `&center_id=${centerFilter}` : ''}`
            : '/api/admin/users',
          { credentials: 'include' }
        ),
        fetch(superAdminFlag ? '/api/admin/centers/all' : '/api/admin/centers', {
          credentials: 'include'
        })
      ]);

      if (usersRes.status === 401 || centersRes.status === 401) {
        router.replace('/');
        return;
      }

      if (usersRes.status === 403 || centersRes.status === 403) {
        setError('접근 권한이 없습니다.');
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
  }, [router, centerFilter]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    loadData(isSuperAdmin);
  }, [isSuperAdmin, loadData]);

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

  const handleResetPassword = async (userId: string) => {
    const nextPassword = window.prompt('새 비밀번호를 입력하세요.');
    if (!nextPassword) return;

    setActionId(userId);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetchWithTimeout(
        `/api/admin/users/${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: nextPassword }),
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '비밀번호 초기화에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...result.data } : user)));
    } catch (err) {
      setError('비밀번호 초기화에 실패했습니다.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    setActionId(userId);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetchWithTimeout(
        `/api/admin/users/${userId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '사용자 삭제에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError('사용자 삭제에 실패했습니다.');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleSuperAdmin = async (userId: string, nextValue: boolean) => {
    setActionId(userId);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetchWithTimeout(
        `/api/admin/users/${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_superadmin: nextValue }),
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '권한 변경에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...result.data } : user)));
    } catch (err) {
      setError('권한 변경에 실패했습니다.');
    } finally {
      setActionId(null);
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

        {isSuperAdmin && (
          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
            <label className="text-sm">
              센터 필터
              <select
                className="ml-2 h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={centerFilter}
                onChange={(event) => setCenterFilter(event.target.value)}
              >
                <option value="">전체 센터</option>
                {centerOptions.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name} ({center.code})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(user.is_superadmin)}
                        onChange={(event) => handleToggleSuperAdmin(user.id, event.target.checked)}
                      />
                      {strings.adminUsers.adminToggle}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(user.id)}
                      disabled={actionId === user.id}
                      className="h-8 whitespace-nowrap rounded-md border border-slate-200 px-3 text-xs"
                    >
                      {strings.adminUsers.resetPassword}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      disabled={actionId === user.id}
                      className="h-8 whitespace-nowrap rounded-md border border-red-200 px-3 text-xs text-red-600"
                    >
                      {strings.adminUsers.deleteUser}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
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
                    <th className="py-2 pr-4">관리자</th>
                    <th className="py-2 pr-4">생성일</th>
                    <th className="py-2 pr-4">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{user.email || '-'}</td>
                      <td className="py-2 pr-4">{user.username || '-'}</td>
                      <td className="py-2 pr-4">{user.centers?.name || '-'}</td>
                      <td className="py-2 pr-4">
                        <input
                          type="checkbox"
                          checked={Boolean(user.is_superadmin)}
                          onChange={(event) => handleToggleSuperAdmin(user.id, event.target.checked)}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user.id)}
                            disabled={actionId === user.id}
                            className="h-8 whitespace-nowrap rounded-md border border-slate-200 px-3 text-xs"
                          >
                            {strings.adminUsers.resetPassword}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id)}
                            disabled={actionId === user.id}
                            className="h-8 whitespace-nowrap rounded-md border border-red-200 px-3 text-xs text-red-600"
                          >
                            {strings.adminUsers.deleteUser}
                          </button>
                        </div>
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
