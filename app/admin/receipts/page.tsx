'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { getStorageInfoFromUrl } from '@/lib/storagePath';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

interface Receipt {
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

export default function ReceiptsAdminPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalRequestId, setModalRequestId] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const router = useRouter();
  const selectedId = selected?.id ?? null;

  const ReceiptDetail = ({ receipt }: { receipt: Receipt }) => (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">등록일</p>
          <p className="text-sm">{new Date(receipt.created_at).toLocaleString('ko-KR')}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">차명</p>
          <p className="text-sm">{receipt.vehicle_name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">차량번호</p>
          <p className="text-sm">{receipt.vehicle_number}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">주행거리</p>
          <p className="text-sm">{receipt.mileage_km} km</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">고객명</p>
          <p className="text-sm">{receipt.customer_name || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">전화번호</p>
          <p className="text-sm">{receipt.phone || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">구입일자</p>
          <p className="text-sm">{receipt.purchase_date || '-'}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs text-slate-500">증상</p>
          <p className="text-sm whitespace-pre-wrap">{receipt.symptom || '-'}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs text-slate-500">정비내용</p>
          <p className="text-sm whitespace-pre-wrap">{receipt.service_detail || '-'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {receipt.vin_image_url ? (
          <button
            type="button"
            onClick={() => openImage(receipt.vin_image_url, 'VIN 사진')}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:border-slate-300"
          >
            <span>VIN 사진 크게 보기</span>
            <span className="text-xs text-slate-400">클릭</span>
          </button>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-400">VIN 사진 없음</div>
        )}
        {receipt.engine_image_url ? (
          <button
            type="button"
            onClick={() => openImage(receipt.engine_image_url, '엔진번호 사진')}
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
    </>
  );

  useEffect(() => {
    const fetchReceipts = async () => {
      const response = await fetch('/api/receipts');
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

  // Mobile UX: when bottom-sheet is open, prevent background scrolling.
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

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

  const openDeleteConfirm = (receipt: Receipt) => {
    setDeleteTarget(receipt);
    setDeleteError(null);
    setDeleteRequestId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteRequestId(null);

    try {
      const response = await fetchWithTimeout(`/api/receipts/${deleteTarget.id}`, { method: 'DELETE' }, 12000);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDeleteError(result.error || result.message || '삭제 실패');
        setDeleteRequestId(result.requestId || null);
        return;
      }
      setReceipts((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) {
        setSelected(null);
      }
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError('삭제 실패');
    } finally {
      setDeleteLoading(false);
    }
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
              로그아웃
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">불러오는 중...</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0">
              <div className="space-y-3 md:hidden">
                {filtered.map((receipt) => {
                  const isSelected = selectedId === receipt.id;
                  return (
                    <button
                      key={receipt.id}
                      type="button"
                      onClick={() => setSelected(receipt)}
                      className={[
                        'w-full rounded-lg border bg-white p-4 text-left shadow-sm transition',
                        isSelected ? 'border-slate-300 ring-2 ring-slate-900/10' : 'border-slate-200'
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold">{receipt.customer_name || '고객 미입력'}</p>
                          <p className="text-xs text-slate-500">{new Date(receipt.created_at).toLocaleDateString('ko-KR')}</p>
                        </div>
                        <span className="text-xs text-slate-500">{receipt.vehicle_number}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{receipt.vehicle_name}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm">{receipt.phone || '-'}</span>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/receipts/${receipt.id}/edit`}
                            onClick={(event) => event.stopPropagation()}
                            className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                          >
                            수정
                          </Link>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteConfirm(receipt);
                            }}
                            className="whitespace-nowrap rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>상세 보기</span>
                        <span aria-hidden="true">›</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="border-b border-slate-200 text-left">
                    <tr>
                      <th className="py-2 pr-4">등록일</th>
                      <th className="py-2 pr-4">차명</th>
                      <th className="py-2 pr-4">차량번호</th>
                      <th className="py-2 pr-4">고객명</th>
                      <th className="py-2 pr-4">전화번호</th>
                      <th className="py-2 pr-4">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((receipt) => {
                      const isSelected = selectedId === receipt.id;
                      return (
                        <tr
                          key={receipt.id}
                          className={[
                            'cursor-pointer border-b border-slate-100 hover:bg-slate-50',
                            isSelected ? 'bg-slate-50' : ''
                          ].join(' ')}
                          onClick={() => setSelected(receipt)}
                        >
                          <td className="py-2 pr-4">{new Date(receipt.created_at).toLocaleDateString('ko-KR')}</td>
                          <td className="py-2 pr-4">{receipt.vehicle_name}</td>
                          <td className="py-2 pr-4">{receipt.vehicle_number}</td>
                          <td className="py-2 pr-4">{receipt.customer_name || '-'}</td>
                          <td className="py-2 pr-4">{receipt.phone || '-'}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/receipts/${receipt.id}/edit`}
                                onClick={(event) => event.stopPropagation()}
                                className="whitespace-nowrap rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
                              >
                                수정
                              </Link>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDeleteConfirm(receipt);
                                }}
                                className="whitespace-nowrap rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:border-red-300"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="hidden md:block">
              <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">접수 상세</h3>
                  {selected && (
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
                      onClick={() => setSelected(null)}
                    >
                      닫기
                    </button>
                  )}
                </div>

                {selected ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/receipts/${selected.id}/edit`}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white"
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(selected)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:border-red-300"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-4">
                      <ReceiptDetail receipt={selected} />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">목록에서 접수 내역을 선택하면 여기에 상세가 표시됩니다.</p>
                )}
              </div>
            </aside>
          </div>
        )}
      </section>

      {selected && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-50 bg-black/40" role="presentation" onClick={() => setSelected(null)} />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-auto rounded-t-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">접수 상세</p>
                <p className="mt-1 truncate text-base font-semibold">
                  {selected.customer_name || '고객 미입력'} · {selected.vehicle_number}
                </p>
                <p className="mt-1 text-xs text-slate-500">{selected.phone || '-'}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600"
                onClick={() => setSelected(null)}
              >
                닫기
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/admin/receipts/${selected.id}/edit`}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white"
              >
                수정
              </Link>
              <button
                type="button"
                onClick={() => openDeleteConfirm(selected)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600"
              >
                삭제
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <ReceiptDetail receipt={selected} />
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-md border border-slate-200 bg-white py-2 text-sm text-slate-700"
              onClick={() => setSelected(null)}
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
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
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-base font-semibold">접수 삭제</h4>
            <p className="mt-2 text-sm text-slate-600">
              삭제 후 복구할 수 없습니다. 정말 삭제하시겠습니까?
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              {deleteTarget.vehicle_name} · {deleteTarget.vehicle_number}
            </div>
            {deleteError && (
              <p className="mt-3 text-xs text-red-500">
                {deleteError}
                {deleteRequestId && <span className="ml-2">requestId: {deleteRequestId}</span>}
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                disabled={deleteLoading}
              >
                취소
              </button>
              {deleteError && !deleteLoading && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600"
                >
                  재시도
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-1.5 text-sm text-white disabled:opacity-60"
                disabled={deleteLoading}
              >
                {deleteLoading ? '삭제중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

