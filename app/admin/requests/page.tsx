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

type AdminRequest = {
  id: string;
  username: string;
  center_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at: string | null;
  center_id: string | null;
};

export default function AdminRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedCenters, setSelectedCenters] = useState<Record<string, string>>({});

  const centerOptions = useMemo(() => centers, [centers]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRequestId(null);

    try {
      const [requestsRes, centersRes] = await Promise.all([
        fetch('/api/admin/requests', { credentials: 'include' }),
        fetch('/api/admin/centers/all', { credentials: 'include' })
      ]);

      if (requestsRes.status === 401 || centersRes.status === 401) {
        router.replace('/');
        return;
      }

      if (requestsRes.status === 403 || centersRes.status === 403) {
        setError('접근 권한이 없습니다.');
        return;
      }

      const requestsResult = await requestsRes.json().catch(() => ({}));
      const centersResult = await centersRes.json().catch(() => ({}));

      if (!requestsRes.ok) {
        setError(requestsResult.error || requestsResult.message || '요청 목록을 불러오지 못했습니다.');
        setRequestId(requestsResult.requestId || null);
        return;
      }

      if (!centersRes.ok) {
        setError(centersResult.error || centersResult.message || '센터 목록을 불러오지 못했습니다.');
        setRequestId(centersResult.requestId || null);
        return;
      }

      setRequests(requestsResult.data || []);
      setCenters(centersResult.data || []);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setSavingId(id);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetchWithTimeout(
        `/api/admin/requests/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            center_id: action === 'approve' ? selectedCenters[id] : undefined
          }),
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '요청 처리에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }

      setRequests((prev) => prev.map((item) => (item.id === id ? { ...item, ...result.data } : item)));
    } catch (err) {
      setError('요청 처리에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const statusLabel = (status: AdminRequest['status']) => {
    if (status === 'approved') return strings.accountApproval.approved;
    if (status === 'rejected') return strings.accountApproval.rejected;
    return strings.accountApproval.pending;
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{strings.accountApproval.title}</h2>
          <p className="text-sm text-slate-500">{strings.accountApproval.description}</p>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">{strings.common.loading}</p>
        ) : (
          <div className="mt-6 space-y-4">
            {requests.length === 0 && (
              <p className="text-sm text-slate-500">대기 중인 요청이 없습니다.</p>
            )}
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{request.username}</p>
                    <p className="text-xs text-slate-500">요청 센터: {request.center_name}</p>
                    <p className="text-xs text-slate-400">
                      요청일: {new Date(request.requested_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs">
                    {statusLabel(request.status)}
                  </span>
                </div>

                {request.status === 'pending' && (
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                    <select
                      className="h-11 rounded-md border border-slate-200 px-3 text-sm"
                      value={selectedCenters[request.id] || ''}
                      onChange={(event) =>
                        setSelectedCenters((prev) => ({ ...prev, [request.id]: event.target.value }))
                      }
                    >
                      <option value="">{strings.accountApproval.selectCenter}</option>
                      {centerOptions.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name} ({center.code})
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={savingId === request.id}
                        className="h-11 whitespace-nowrap rounded-md bg-slate-900 px-4 text-sm text-white disabled:opacity-60"
                      >
                        {strings.accountApproval.approve}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(request.id, 'reject')}
                        disabled={savingId === request.id}
                        className="h-11 whitespace-nowrap rounded-md border border-slate-200 px-4 text-sm text-slate-700 disabled:opacity-60"
                      >
                        {strings.accountApproval.reject}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs text-red-500">
            {error}
            {requestId && <span className="ml-2">requestId: {requestId}</span>}
          </p>
        )}
      </section>
    </main>
  );
}
