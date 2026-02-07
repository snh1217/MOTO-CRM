'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { getStorageInfoFromUrl } from '@/lib/storagePath';

interface AsReceipt {
  id: string;
  created_at: string;
  vehicle_name: string;
  vehicle_number: string;
  mileage_km: number;
  customer_name: string | null;
  phone: string | null;
  purchase_date: string | null;
  vin_image_url: string | null;
  engine_image_url: string | null;
  symptom: string | null;
  service_detail: string | null;
}

export default function AsAdminPage() {
  const [receipts, setReceipts] = useState<AsReceipt[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalRequestId, setModalRequestId] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchReceipts = async () => {
      const response = await fetch('/api/as');
      if (response.status === 401) {
        router.replace('/');
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
        (receipt.customer_name ?? '').toLowerCase().includes(q) ||
        receipt.vehicle_number.toLowerCase().includes(q) ||
        receipt.vehicle_name.toLowerCase().includes(q)
    );
  }, [query, receipts]);

  const handleExitAdmin = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/');
  };

  const openImage = async (rawUrl: string | null, title: string) => {
    if (!rawUrl) return;
    setImageLoading(true);
    setModalError(null);
    setModalRequestId(null);

    try {
      let finalUrl = rawUrl;
      const info = getStorageInfoFromUrl(rawUrl);
      if (info) {
        const response = await fetch(
          `/api/storage/signed-url?bucket=${encodeURIComponent(info.bucket)}&path=${encodeURIComponent(
            info.path
          )}&expiresIn=180`
        );
        const result = await response.json();
        if (!response.ok) {
          setModalError(result.error || result.message || '이미지 URL 생성 실패');
          setModalRequestId(result.requestId || null);
        } else if (result.signedUrl) {
          finalUrl = result.signedUrl;
        }
      }
      setModalImage({ url: finalUrl, title });
    } catch (error) {
      setModalError('이미지 로드 실패');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">A/S 내역</h2>
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
              href="/api/as/export"
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
          <>
            <div className="mt-6 space-y-3 md:hidden">
              {filtered.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => setSelected(receipt)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{receipt.customer_name || '고객 미입력'}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(receipt.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{receipt.vehicle_number}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{receipt.vehicle_name}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm">{receipt.phone || '-'}</span>
                    <Link
                      href={`/admin/as/${receipt.id}/edit`}
                      onClick={(event) => event.stopPropagation()}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 whitespace-nowrap"
                    >
                      수정
                    </Link>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse text-sm">
              <thead className="border-b border-slate-200 text-left">
                <tr>
                  <th className="py-2 pr-4">등록일</th>
                  <th className="py-2 pr-4">차종</th>
                  <th className="py-2 pr-4">차량번호</th>
                  <th className="py-2 pr-4">성명</th>
                  <th className="py-2 pr-4">전화번호</th>
                  <th className="py-2 pr-4">작업</th>
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
                    <td className="py-2 pr-4">{receipt.customer_name || '-'}</td>
                    <td className="py-2 pr-4">{receipt.phone || '-'}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/as/${receipt.id}/edit`}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 whitespace-nowrap"
                      >
                        수정
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>

      {selected && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">A/S 상세</h3>
            <button className="text-sm text-slate-500" onClick={() => setSelected(null)}>
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
              <p className="text-xs text-slate-500">차종</p>
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
              <p className="text-xs text-slate-500">성명</p>
              <p className="text-sm">{selected.customer_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">전화번호</p>
              <p className="text-sm">{selected.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">구입일자</p>
              <p className="text-sm">{selected.purchase_date || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500">증상</p>
              <p className="text-sm">{selected.symptom || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500">정비내용</p>
              <p className="text-sm">{selected.service_detail || '-'}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {selected.vin_image_url ? (
              <button
                type="button"
                onClick={() => openImage(selected.vin_image_url, 'VIN 사진')}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:border-slate-300"
              >
                <span>VIN 사진 크게 보기</span>
                <span className="text-xs text-slate-400">클릭</span>
              </button>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-400">
                VIN 사진 없음
              </div>
            )}
            {selected.engine_image_url ? (
              <button
                type="button"
                onClick={() => openImage(selected.engine_image_url, '엔진번호 사진')}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:border-slate-300"
              >
                <span>엔진번호 사진 크게 보기</span>
                <span className="text-xs text-slate-400">클릭</span>
              </button>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-400">
                엔진번호 사진 없음
              </div>
            )}
          </div>
        </section>
      )}

      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-lg bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">{modalImage.title}</h4>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600"
                onClick={() => setModalImage(null)}
              >
                닫기
              </button>
            </div>
            {imageLoading ? (
              <p className="text-sm text-slate-500">이미지 불러오는 중...</p>
            ) : (
              <div className="max-h-[80vh] overflow-auto">
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={modalImage.url}
                    alt={modalImage.title}
                    className="mx-auto max-h-[75vh] w-auto max-w-full"
                  />
                </>
              </div>
            )}
            {modalError && (
              <div className="mt-3 text-xs text-red-500">
                {modalError}
                {modalRequestId && <span className="ml-2 text-[11px]">requestId: {modalRequestId}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}





