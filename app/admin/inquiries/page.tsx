'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

interface Inquiry {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  content: string;
  contacted: boolean;
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
  const router = useRouter();

  const fetchInquiries = async () => {
    const response = await fetch('/api/inquiries');
    if (response.status === 401) {
      router.replace('/admin');
      return;
    }
    const result = await response.json();
    setInquiries(result.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

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
    const response = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacted: !inquiry.contacted })
    });

    if (response.ok) {
      await fetchInquiries();
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
          </div>
        </section>
      )}
    </main>
  );
}

