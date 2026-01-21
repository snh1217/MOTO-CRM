'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

interface Inquiry {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  content: string;
  contacted: boolean;
  note?: string | null;
  note_updated_at?: string | null;
}

function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^0-9]/g, '');
}

export default function InquiriesAdminPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [contactedFilter, setContactedFilter] = useState<'all' | 'contacted' | 'uncontacted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteRequestId, setNoteRequestId] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [noteRetry, setNoteRetry] = useState(false);
  const router = useRouter();

  const fetchInquiries = async () => {
    const response = await fetch('/api/inquiries');
    if (response.status === 401) {
      router.replace('/admin');
      return;
    }
    const result = await response.json();
    const next = result.data || [];
    setInquiries(next);
    setSelected((prev) => (prev ? next.find((item: Inquiry) => item.id === prev.id) ?? prev : null));
    setLoading(false);
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setNoteDraft(selected.note ?? '');
    setNoteError(null);
    setNoteSuccess(null);
    setNoteRequestId(null);
    setNoteRetry(false);
  }, [selected?.id]);

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

  const toggleContacted = async (inquiry: Inquiry) => {
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
      const updated = result.data ?? { ...inquiry, contacted: !inquiry.contacted };
      setInquiries((prev) => prev.map((item) => (item.id === inquiry.id ? updated : item)));
      setSelected((prev) => (prev?.id === inquiry.id ? updated : prev));
    } catch {
      // No UI surface for toggle failure; keep existing state.
    }
  };

  const saveNote = async () => {
    if (!selected) return;
    setNoteSaving(true);
    setNoteError(null);
    setNoteSuccess(null);
    setNoteRequestId(null);
    setNoteRetry(false);

    try {
      const response = await fetchWithTimeout(`/api/inquiries/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteDraft })
      });
      const result = await response.json().catch(() => ({}));
      setNoteRequestId(result.requestId || null);

      if (!response.ok) {
        setNoteError(result.error || '메모 저장에 실패했습니다.');
        setNoteRetry(true);
        return;
      }

      const updated = result.data ?? {
        ...selected,
        note: noteDraft,
        note_updated_at: new Date().toISOString()
      };
      setInquiries((prev) => prev.map((item) => (item.id === selected.id ? updated : item)));
      setSelected(updated);
      setNoteSuccess('메모가 저장되었습니다.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setNoteError('요청 시간이 초과되었습니다. 다시 시도해 주세요.');
      } else {
        setNoteError('메모 저장 중 오류가 발생했습니다.');
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

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">문의 내역</h2>
            <p className="text-sm text-slate-500">총 {filteredInquiries.length}건</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/inquiries/export"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              엑셀 다운로드
            </a>
            <select
              value={contactedFilter}
              onChange={(event) =>
                setContactedFilter(event.target.value as 'all' | 'contacted' | 'uncontacted')
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">전체</option>
              <option value="uncontacted">미연락</option>
              <option value="contacted">연락 완료</option>
            </select>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="고객명/전화번호 검색"
              className="w-48 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleExitAdmin}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
            >
              관리자 모드 해제
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">불러오는 중...</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="border-b border-slate-200 text-left">
                <tr>
                  <th className="py-2 pr-4">등록일</th>
                  <th className="py-2 pr-4">고객명</th>
                  <th className="py-2 pr-4">전화번호</th>
                  <th className="py-2 pr-4">특이사항</th>
                  <th className="py-2 pr-4">연락유무</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => setSelected(inquiry)}
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
                          전화
                        </a>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      {inquiry.note?.trim() ? (
                        <span
                          title={
                            inquiry.note.length > 30
                              ? `${inquiry.note.slice(0, 30)}…`
                              : inquiry.note
                          }
                          aria-label="특이사항 있음"
                        >
                          📝
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
                        {inquiry.contacted ? '완료' : '미연락'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">문의 상세</h3>
            <button
              className="text-sm text-slate-500"
              onClick={() => setSelected(null)}
            >
              닫기
            </button>
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="text-xs text-slate-500">등록일</p>
              <p className="text-sm">
                {new Date(selected.created_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">고객명</p>
              <p className="text-sm">{selected.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">전화번호</p>
              <div className="flex items-center gap-2">
                <p className="text-sm">{selected.phone}</p>
                <a
                  href={`tel:${normalizePhoneNumber(selected.phone)}`}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-slate-300"
                >
                  전화
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">문의내용</p>
              <p className="text-sm">{selected.content}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">특이사항(통화 메모)</p>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="통화 중 특이사항을 기록하세요."
              />
              {selected.note_updated_at && (
                <p className="mt-1 text-[11px] text-slate-400">
                  마지막 메모 수정:{' '}
                  {new Date(selected.note_updated_at).toLocaleString('ko-KR')}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={noteSaving}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {noteSaving ? '저장 중...' : '메모 저장'}
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
                    재시도
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

