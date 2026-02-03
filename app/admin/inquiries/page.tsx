'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

interface InquiryListItem {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  contacted: boolean;
  note_exists: boolean;
  note_preview: string;
}

interface InquiryDetail {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  content: string;
  contacted: boolean;
  note?: string | null;
  note_updated_at?: string | null;
}

type ServerTimings = {
  total?: number;
  db?: number;
  auth?: number;
  serialize?: number;
};

type PerfState = {
  requestId: string | null;
  fetchMs: number;
  jsonMs: number;
  serverTimings: ServerTimings;
  payloadBytes: number | null;
  rowCount: number | null;
};

const LIST_SKELETON_ROWS = Array.from({ length: 7 });

function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^0-9]/g, '');
}

function parseServerTiming(value: string | null): ServerTimings {
  if (!value) return {};
  const entries = value.split(',').map((entry) => entry.trim());
  const timings: ServerTimings = {};
  entries.forEach((entry) => {
    const [name, rest] = entry.split(';');
    const durMatch = rest?.match(/dur=([0-9.]+)/);
    if (!durMatch) return;
    const duration = Number(durMatch[1]);
    if (name === 'total') timings.total = duration;
    if (name === 'db') timings.db = duration;
    if (name === 'auth') timings.auth = duration;
    if (name === 'serialize') timings.serialize = duration;
  });
  return timings;
}

function inferBottleneck(perf: PerfState | null, previousTotal: number | null) {
  if (!perf) return null;
  const { serverTimings, payloadBytes, jsonMs } = perf;
  const total = serverTimings.total ?? 0;
  const db = serverTimings.db ?? 0;
  const auth = serverTimings.auth ?? 0;
  const serialize = serverTimings.serialize ?? 0;

  if (db > 500 || (total > 0 && db / total > 0.6)) {
    return 'DB likely slow (query time dominates).';
  }

  if ((payloadBytes ?? 0) > 50000 && jsonMs > 120) {
    return 'Payload/parse likely slow (large response + JSON parse time).';
  }

  if (total > 800 && db + auth + serialize < total * 0.5) {
    return 'Cold start/runtime overhead likely (server total is large without DB/auth time).';
  }

  if (previousTotal && total > previousTotal * 2) {
    return 'Cold start/runtime overhead likely (first request much slower).';
  }

  return 'No obvious bottleneck detected.';
}

export default function InquiriesAdminPage() {
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<InquiryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLoadingSlow, setDetailLoadingSlow] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [contactedFilter, setContactedFilter] = useState<'all' | 'contacted' | 'uncontacted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteRequestId, setNoteRequestId] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [noteRetry, setNoteRetry] = useState(false);
  const [listPerf, setListPerf] = useState<PerfState | null>(null);
  const [detailPerf, setDetailPerf] = useState<PerfState | null>(null);
  const [previousListTotal, setPreviousListTotal] = useState<number | null>(null);
  const lastListTotalRef = useRef<number | null>(null);
  const listSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === '1';

  const fetchInquiries = async () => {
    setLoading(true);
    setLoadingSlow(false);
    if (listSlowTimerRef.current) {
      clearTimeout(listSlowTimerRef.current);
    }
    listSlowTimerRef.current = setTimeout(() => setLoadingSlow(true), 3000);

    const listUrl = debugMode ? '/api/inquiries?debug=1' : '/api/inquiries';
    const fetchStart = performance.now();
    try {
      const response = await fetch(listUrl);
      const fetchMs = performance.now() - fetchStart;
      if (response.status === 401) {
        router.replace('/admin');
        return;
      }
      const jsonStart = performance.now();
      const result = await response.json();
      const jsonMs = performance.now() - jsonStart;
      const next = result.data || [];
      setInquiries(next);
      setSelectedDetail(null);

      if (debugMode) {
        const serverTimings = parseServerTiming(response.headers.get('x-server-timing'));
        const payloadBytes = response.headers.get('x-payload-bytes');
        const perf: PerfState = {
          requestId: result.requestId || response.headers.get('x-request-id'),
          fetchMs: Math.round(fetchMs),
          jsonMs: Math.round(jsonMs),
          serverTimings,
          payloadBytes: payloadBytes ? Number(payloadBytes) : null,
          rowCount: Array.isArray(next) ? next.length : null
        };
        setListPerf(perf);
        setPreviousListTotal(lastListTotalRef.current);
        lastListTotalRef.current = serverTimings.total ?? null;
      }
    } finally {
      if (listSlowTimerRef.current) {
        clearTimeout(listSlowTimerRef.current);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [debugMode]);

  useEffect(() => {
    if (!selectedDetail) return;
    setNoteDraft(selectedDetail.note ?? '');
    setNoteError(null);
    setNoteSuccess(null);
    setNoteRequestId(null);
    setNoteRetry(false);
  }, [selectedDetail?.id]);

  const filteredInquiries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesContacted =
        contactedFilter === 'all' ||
        (contactedFilter === 'contacted' && inquiry.contacted) ||
        (contactedFilter === 'uncontacted' && !inquiry.contacted);

      if (!matchesContacted) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        inquiry.customer_name.toLowerCase().includes(term) ||
        inquiry.phone.toLowerCase().includes(term)
      );
    });
  }, [inquiries, contactedFilter, searchTerm]);

  const updateInquiryFromDetail = (detail: InquiryDetail) => {
    const noteValue = detail.note ? detail.note.trim() : '';
    setInquiries((prev) =>
      prev.map((item) =>
        item.id === detail.id
          ? {
              ...item,
              contacted: detail.contacted,
              note_exists: noteValue.length > 0,
              note_preview: noteValue ? noteValue.slice(0, 30) : ''
            }
          : item
      )
    );
  };

  const toggleContacted = async (inquiry: InquiryListItem) => {
    try {
      const response = await fetchWithTimeout(`/api/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacted: !inquiry.contacted })
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json().catch(() => ({}));
      const updated = result.data as InquiryDetail | undefined;
      if (updated) {
        updateInquiryFromDetail(updated);
        if (selectedDetail?.id === inquiry.id) {
          setSelectedDetail(updated);
        }
      } else {
        setInquiries((prev) =>
          prev.map((item) =>
            item.id === inquiry.id ? { ...item, contacted: !inquiry.contacted } : item
          )
        );
      }
    } catch {
      // No UI surface for toggle failure; keep existing state.
    }
  };

  const fetchDetail = async (id: string) => {
    setSelectedDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setDetailLoadingSlow(false);
    if (detailSlowTimerRef.current) {
      clearTimeout(detailSlowTimerRef.current);
    }
    detailSlowTimerRef.current = setTimeout(() => setDetailLoadingSlow(true), 3000);

    const detailUrl = debugMode ? `/api/inquiries/${id}?debug=1` : `/api/inquiries/${id}`;
    const fetchStart = performance.now();
    try {
      const response = await fetchWithTimeout(detailUrl);
      const fetchMs = performance.now() - fetchStart;
      if (response.status === 401) {
        router.replace('/admin');
        return;
      }
      const jsonStart = performance.now();
      const result = await response.json();
      const jsonMs = performance.now() - jsonStart;

      if (!response.ok) {
        setDetailError(result.error || '?? ??? ???? ?????.');
        return;
      }

      setSelectedDetail(result.data);
      if (debugMode) {
        const serverTimings = parseServerTiming(response.headers.get('x-server-timing'));
        const payloadBytes = response.headers.get('x-payload-bytes');
        const perf: PerfState = {
          requestId: result.requestId || response.headers.get('x-request-id'),
          fetchMs: Math.round(fetchMs),
          jsonMs: Math.round(jsonMs),
          serverTimings,
          payloadBytes: payloadBytes ? Number(payloadBytes) : null,
          rowCount: result.data ? 1 : 0
        };
        setDetailPerf(perf);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setDetailError('?? ??? ???????. ?? ??? ???.');
      } else {
        setDetailError('?? ??? ???? ? ??? ??????.');
      }
    } finally {
      if (detailSlowTimerRef.current) {
        clearTimeout(detailSlowTimerRef.current);
      }
      setDetailLoading(false);
    }
  };

  const saveNote = async () => {
    if (!selectedDetail) return;
    setNoteSaving(true);
    setNoteError(null);
    setNoteSuccess(null);
    setNoteRequestId(null);
    setNoteRetry(false);

    try {
      const response = await fetchWithTimeout(`/api/inquiries/${selectedDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteDraft })
      });
      const result = await response.json().catch(() => ({}));
      setNoteRequestId(result.requestId || null);

      if (!response.ok) {
        setNoteError(result.error || '?? ??? ??????.');
        setNoteRetry(true);
        return;
      }

      const updated = (result.data || {
        ...selectedDetail,
        note: noteDraft,
        note_updated_at: new Date().toISOString()
      }) as InquiryDetail;
      setSelectedDetail(updated);
      updateInquiryFromDetail(updated);
      setNoteSuccess('??? ???????.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setNoteError('?? ??? ???????. ?? ??? ???.');
      } else {
        setNoteError('?? ?? ? ??? ??????.');
      }
      setNoteRetry(true);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleExitAdmin = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin');
  };

  const listBottleneck = debugMode ? inferBottleneck(listPerf, previousListTotal) : null;

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">?? ??</h2>
            <p className="text-sm text-slate-500">? {filteredInquiries.length}?</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/inquiries/export"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              ?? ????
            </a>
            <select
              value={contactedFilter}
              onChange={(event) =>
                setContactedFilter(event.target.value as 'all' | 'contacted' | 'uncontacted')
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">??</option>
              <option value="uncontacted">???</option>
              <option value="contacted">?? ??</option>
            </select>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="???/???? ??"
              className="w-48 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleExitAdmin}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
            >
              ??? ?? ??
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {LIST_SKELETON_ROWS.map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-10 rounded-md bg-slate-100 animate-pulse"
              />
            ))}
            {loadingSlow && (
              <p className="text-sm text-slate-500">
                Loading may take longer due to network/server delay.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3 md:hidden">
              {filteredInquiries.map((inquiry) => (
                <button
                  key={inquiry.id}
                  type="button"
                  onClick={() => fetchDetail(inquiry.id)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{inquiry.customer_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    {inquiry.note_exists && (
                      <span
                        title={inquiry.note_preview || undefined}
                        aria-label="???? ??"
                      >
                        ??
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-sm">{inquiry.phone}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleContacted(inquiry);
                      }}
                      className={`rounded-full px-3 py-1 text-xs ${
                        inquiry.contacted
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {inquiry.contacted ? '??' : '???'}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={`tel:${normalizePhoneNumber(inquiry.phone)}`}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                      onClick={(event) => event.stopPropagation()}
                    >
                      ??
                    </a>
                    <span className="text-xs text-slate-500">?? ??</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse text-sm">
                <thead className="border-b border-slate-200 text-left">
                  <tr>
                    <th className="py-2 pr-4">???</th>
                    <th className="py-2 pr-4">???</th>
                    <th className="py-2 pr-4">????</th>
                    <th className="py-2 pr-4">????</th>
                    <th className="py-2 pr-4">????</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      onClick={() => fetchDetail(inquiry.id)}
                    >
                      <td className="py-2 pr-4">
                        {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-2 pr-4">{inquiry.customer_name}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span>{inquiry.phone}</span>
                          <a
                            href={`tel:${normalizePhoneNumber(inquiry.phone)}`}
                            className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-slate-300"
                            onClick={(event) => event.stopPropagation()}
                          >
                            ??
                          </a>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {inquiry.note_exists ? (
                          <span
                            title={inquiry.note_preview || undefined}
                            aria-label="???? ??"
                          >
                            ??
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleContacted(inquiry);
                          }}
                          className={`rounded-full px-3 py-1 text-xs ${
                            inquiry.contacted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {inquiry.contacted ? '??' : '???'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {(detailLoading || selectedDetail || detailError) && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">?? ??</h3>
            <button
              className="text-sm text-slate-500"
              onClick={() => {
                setSelectedDetail(null);
                setDetailError(null);
              }}
            >
              ??
            </button>
          </div>
          {detailLoading ? (
            <div className="mt-4 space-y-3">
              <div className="h-6 rounded-md bg-slate-100 animate-pulse" />
              <div className="h-6 rounded-md bg-slate-100 animate-pulse" />
              <div className="h-24 rounded-md bg-slate-100 animate-pulse" />
              {detailLoadingSlow && (
                <p className="text-sm text-slate-500">
                  Loading may take longer due to network/server delay.
                </p>
              )}
            </div>
          ) : detailError ? (
            <p className="mt-4 text-sm text-rose-600">{detailError}</p>
          ) : selectedDetail ? (
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-xs text-slate-500">???</p>
                <p className="text-sm">
                  {new Date(selectedDetail.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">???</p>
                <p className="text-sm">{selectedDetail.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">????</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{selectedDetail.phone}</p>
                  <a
                    href={`tel:${normalizePhoneNumber(selectedDetail.phone)}`}
                    className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-slate-300"
                  >
                    ??
                  </a>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">????</p>
                <p className="text-sm whitespace-pre-wrap">{selectedDetail.content}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">????(?? ??)</p>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="?? ? ????? ?????."
                />
                {selectedDetail.note_updated_at && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    ??? ?? ??:{' '}
                    {new Date(selectedDetail.note_updated_at).toLocaleString('ko-KR')}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={saveNote}
                    disabled={noteSaving}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {noteSaving ? '?? ?...' : '?? ??'}
                  </button>
                  {noteSuccess && (
                    <div className="text-xs text-emerald-600">
                      {noteSuccess}
                      {noteRequestId && <span className="ml-2">requestId: {noteRequestId}</span>}
                    </div>
                  )}
                  {noteError && (
                    <div className="text-xs text-rose-600">
                      {noteError}
                      {noteRequestId && <span className="ml-2">requestId: {noteRequestId}</span>}
                    </div>
                  )}
                  {noteRetry && (
                    <button
                      type="button"
                      onClick={saveNote}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      ???
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">???? ??? ?????.</p>
          )}
        </section>
      )}

      {debugMode && listPerf && (
        <section className="rounded-xl bg-white p-6 text-sm shadow-sm">
          <h4 className="text-base font-semibold">Performance Panel</h4>
          <div className="mt-3 grid gap-2">
            <p>requestId: {listPerf.requestId ?? '-'}</p>
            <p>fetch(ms): {listPerf.fetchMs}</p>
            <p>json(ms): {listPerf.jsonMs}</p>
            <p>
              server timings: total {listPerf.serverTimings.total ?? '-'} / db{' '}
              {listPerf.serverTimings.db ?? '-'} / auth {listPerf.serverTimings.auth ?? '-'} /
              serialize {listPerf.serverTimings.serialize ?? '-'}
            </p>
            <p>payload bytes: {listPerf.payloadBytes ?? '-'}</p>
            <p>row count: {listPerf.rowCount ?? '-'}</p>
            <p>{listBottleneck}</p>
          </div>
          {detailPerf && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="font-semibold">Detail request</p>
              <p>requestId: {detailPerf.requestId ?? '-'}</p>
              <p>fetch(ms): {detailPerf.fetchMs}</p>
              <p>json(ms): {detailPerf.jsonMs}</p>
              <p>
                server timings: total {detailPerf.serverTimings.total ?? '-'} / db{' '}
                {detailPerf.serverTimings.db ?? '-'} / auth {detailPerf.serverTimings.auth ?? '-'} /
                serialize {detailPerf.serverTimings.serialize ?? '-'}
              </p>
              <p>payload bytes: {detailPerf.payloadBytes ?? '-'}</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
