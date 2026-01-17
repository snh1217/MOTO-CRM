'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

interface Receipt {
  id: string;
  created_at: string;
  vehicle_name: string;
  vehicle_number: string;
  mileage_km: number;
  customer_name: string;
  phone: string;
  purchase_date: string;
  vin_image_url: string;
  engine_image_url: string;
  symptom: string;
  service_detail: string;
}

export default function ReceiptsAdminPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchReceipts = async () => {
      const response = await fetch('/api/receipts');
      if (response.status === 401) {
        router.replace('/admin');
        return;
      }
      const result = await response.json();
      setReceipts(result.data || []);
      setLoading(false);
    };
    fetchReceipts();
  }, [router]);

  const filtered = useMemo(() => {
    if (!query) return receipts;
    const q = query.toLowerCase();
    return receipts.filter(
      (receipt) =>
        receipt.customer_name.toLowerCase().includes(q) ||
        receipt.vehicle_number.toLowerCase().includes(q) ||
        receipt.vehicle_name.toLowerCase().includes(q)
    );
  }, [query, receipts]);

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
            <h2 className="text-lg font-semibold">접수 내역</h2>
            <p className="text-sm text-slate-500">총 {receipts.length}건</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="고객명/차량번호 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <a
              href="/api/receipts/export"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              엑셀 다운로드
            </a>
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
                  <th className="py-2 pr-4">차명</th>
                  <th className="py-2 pr-4">차량번호</th>
                  <th className="py-2 pr-4">고객명</th>
                  <th className="py-2 pr-4">전화번호</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => setSelected(receipt)}
                  >
                    <td className="py-2 pr-4">
                      {new Date(receipt.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-2 pr-4">{receipt.vehicle_name}</td>
                    <td className="py-2 pr-4">{receipt.vehicle_number}</td>
                    <td className="py-2 pr-4">{receipt.customer_name}</td>
                    <td className="py-2 pr-4">{receipt.phone}</td>
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
            <h3 className="text-lg font-semibold">접수 상세</h3>
            <button
              className="text-sm text-slate-500"
              onClick={() => setSelected(null)}
            >
              닫기
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">등록일</p>
              <p className="text-sm">
                {new Date(selected.created_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">차명</p>
              <p className="text-sm">{selected.vehicle_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">차량번호</p>
              <p className="text-sm">{selected.vehicle_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">주행거리</p>
              <p className="text-sm">{selected.mileage_km} km</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">고객명</p>
              <p className="text-sm">{selected.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">전화번호</p>
              <p className="text-sm">{selected.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">구입일자</p>
              <p className="text-sm">{selected.purchase_date}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500">증상</p>
              <p className="text-sm">{selected.symptom}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500">정비내용</p>
              <p className="text-sm">{selected.service_detail}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <a
              href={selected.vin_image_url}
              target="_blank"
              className="rounded-lg border border-slate-200 p-3 text-sm"
            >
              차대번호 사진 보기
            </a>
            <a
              href={selected.engine_image_url}
              target="_blank"
              className="rounded-lg border border-slate-200 p-3 text-sm"
            >
              엔진번호 사진 보기
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
