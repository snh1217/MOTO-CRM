'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import DebugPanel, { type DebugLogEntry } from '@/components/DebugPanel';
import {
  BRANDS,
  type Brand,
  getModelsByBrand,
  getZtModelsByType,
  parseVehicleName,
  resolveZtType,
  type ZtType,
  ZT_TYPES
} from '@/lib/models';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { getStoragePathFromUrl } from '@/lib/storagePath';

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

type SubmitStage = 'idle' | 'vin' | 'engine' | 'db' | 'done' | 'error';

const BUCKET = 'vin-engine';

export default function ReceiptEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [form, setForm] = useState({
    vehicleNumber: '',
    mileageKm: '',
    customerName: '',
    phone: '',
    purchaseDate: '',
    symptom: '',
    serviceDetail: ''
  });
  const [brand, setBrand] = useState<Brand>('ZT');
  const [model, setModel] = useState('');
  const [vinImage, setVinImage] = useState<File | null>(null);
  const [engineImage, setEngineImage] = useState<File | null>(null);
  const [deleteVin, setDeleteVin] = useState(false);
  const [deleteEngine, setDeleteEngine] = useState(false);
  const [ztType, setZtType] = useState<ZtType | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitStage, setSubmitStage] = useState<SubmitStage>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<Record<string, unknown> | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [vinPreviewUrl, setVinPreviewUrl] = useState<string | null>(null);
  const [enginePreviewUrl, setEnginePreviewUrl] = useState<string | null>(null);
  const [signedVinUrl, setSignedVinUrl] = useState<string | null>(null);
  const [signedEngineUrl, setSignedEngineUrl] = useState<string | null>(null);

  const models =
    brand === 'ZT'
      ? ztType
        ? getZtModelsByType(ztType)
        : []
      : getModelsByBrand(brand);
  const vehicleName = model ? `${brand} ${model}` : '';
  const inputClassName =
    'h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setShowDebugPanel(params.get('debug') === '1');
  }, []);

  useEffect(() => {
    if (vinPreviewUrl) {
      URL.revokeObjectURL(vinPreviewUrl);
    }
    if (vinImage) {
      setVinPreviewUrl(URL.createObjectURL(vinImage));
    } else {
      setVinPreviewUrl(null);
    }
    return () => {
      if (vinPreviewUrl) {
        URL.revokeObjectURL(vinPreviewUrl);
      }
    };
  }, [vinImage]);

  useEffect(() => {
    if (enginePreviewUrl) {
      URL.revokeObjectURL(enginePreviewUrl);
    }
    if (engineImage) {
      setEnginePreviewUrl(URL.createObjectURL(engineImage));
    } else {
      setEnginePreviewUrl(null);
    }
    return () => {
      if (enginePreviewUrl) {
        URL.revokeObjectURL(enginePreviewUrl);
      }
    };
  }, [engineImage]);

  const addLog = (stage: string, messageText: string) => {
    const time = new Date().toLocaleTimeString('ko-KR');
    setLogs((prev) => [...prev, { time, stage, message: messageText }].slice(-30));
  };

  const clearStageTimer = () => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  };

  const startStageProgress = () => {
    clearStageTimer();
    const stages: SubmitStage[] = [];
    if (vinImage) stages.push('vin');
    if (engineImage) stages.push('engine');
    stages.push('db');

    let index = 0;
    setSubmitStage(stages[index]);
    addLog('submit', `?¨ê³„ ?œì‘: ${stages[index]}`);

    stageTimerRef.current = setInterval(() => {
      if (index < stages.length - 1) {
        index += 1;
        setSubmitStage(stages[index]);
        addLog('submit', `?¨ê³„ ?´ë™: ${stages[index]}`);
      }
    }, 1200);
  };

  useEffect(() => {
    const loadReceipt = async () => {
      const response = await fetch(`/api/receipts/${params.id}`);
      if (response.status === 401) {
        router.replace('/');
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || result.message || '?‘ìˆ˜ ?•ë³´ë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??');
        setErrorDetails({ requestId: result.requestId, status: response.status, body: result });
        return;
      }

      const data: Receipt = result.data;
      setReceipt(data);
      setForm({
        vehicleNumber: data.vehicle_number,
        mileageKm: data.mileage_km?.toString() ?? '',
        customerName: data.customer_name ?? '',
        phone: data.phone ?? '',
        purchaseDate: data.purchase_date ?? '',
        symptom: data.symptom ?? '',
        serviceDetail: data.service_detail ?? ''
      });

      const parsed = parseVehicleName(data.vehicle_name);
      if (parsed) {
        setBrand(parsed.brand);
        if (parsed.brand === 'ZT') {
          const resolvedType = resolveZtType(parsed.model);
          if (resolvedType) {
            setZtType(resolvedType);
            setModel(parsed.model);
          }
        } else {
          setZtType(null);
          setModel(parsed.model);
        }
      }

      const [vinSigned, engineSigned] = await Promise.all([
        fetchSignedUrl(data.vin_image_url),
        fetchSignedUrl(data.engine_image_url)
      ]);
      setSignedVinUrl(vinSigned);
      setSignedEngineUrl(engineSigned);
    };

    loadReceipt();
  }, [params.id, router]);

  const fetchSignedUrl = async (rawUrl: string | null) => {
    if (!rawUrl) return null;
    const path = getStoragePathFromUrl(rawUrl, BUCKET);
    if (!path) return rawUrl;
    const response = await fetch(
      `/api/storage/signed-url?bucket=${encodeURIComponent(BUCKET)}&path=${encodeURIComponent(
        path
      )}&expiresIn=180`
    );
    const result = await response.json();
    if (!response.ok) {
      return rawUrl;
    }
    return result.signedUrl || rawUrl;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    setErrorDetails(null);
    setRequestId(null);
    startStageProgress();

    if (!vehicleName) {
      setLoading(false);
      setSubmitStage('error');
      setMessage('ë¸Œëœ??ëª¨ë¸??? íƒ?´ì£¼?¸ìš”.');
      addLog('validation', 'ë¸Œëœ??ëª¨ë¸ ?„ë½');
      clearStageTimer();
      return;
    }

    const payload = new FormData();
    payload.append('vehicle_name', vehicleName);
    payload.append('vehicle_number', form.vehicleNumber);
    payload.append('mileage_km', form.mileageKm);
    payload.append('customer_name', form.customerName);
    payload.append('phone', form.phone);
    payload.append('purchase_date', form.purchaseDate);
    payload.append('symptom', form.symptom);
    payload.append('service_detail', form.serviceDetail);
    payload.append('delete_vin_image', String(deleteVin));
    payload.append('delete_engine_image', String(deleteEngine));

    if (vinImage) {
      payload.append('vin_image', vinImage);
    }

    if (engineImage) {
      payload.append('engine_image', engineImage);
    }

    addLog('submit', '?‘ìˆ˜ ?˜ì • ?”ì²­ ?œì‘');

    try {
      const response = await fetchWithTimeout(`/api/receipts/${params.id}`, {
        method: 'PATCH',
        body: payload
      });

      const result = await response.json();
      setRequestId(result.requestId || null);

      if (!response.ok) {
        setSubmitStage('error');
        setMessage(result.error || result.message || '?‘ìˆ˜ ?˜ì •???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
        setErrorDetails({ requestId: result.requestId, status: response.status, body: result });
        addLog('error', `?˜ì • ?¤íŒ¨: ${result.error || result.message}`);
        return;
      }

      setSubmitStage('done');
      setMessage(result.message || '?‘ìˆ˜ ?˜ì •???„ë£Œ?˜ì—ˆ?µë‹ˆ??');
      setReceipt(result.data);
      addLog('success', '?‘ìˆ˜ ?˜ì • ?„ë£Œ');
      setTimeout(() => router.push('/admin/receipts'), 800);
    } catch (error) {
      setSubmitStage('error');
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage('?¤íŠ¸?Œí¬/?œë²„ ?‘ë‹µ??ì§€?°ë˜ê³??ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.');
        addLog('timeout', '?”ì²­ ?€?„ì•„??);
      } else {
        setMessage('?”ì²­ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.');
        addLog('error', '?”ì²­ ì²˜ë¦¬ ì¤??ˆì™¸ ë°œìƒ');
      }
      setErrorDetails({ error });
    } finally {
      clearStageTimer();
      setLoading(false);
    }
  };

  const stageLabel = useMemo(() => {
    switch (submitStage) {
      case 'vin':
        return 'VIN ?´ë?ì§€ ?…ë¡œ??ì¤?..';
      case 'engine':
        return '?”ì§„ ?´ë?ì§€ ?…ë¡œ??ì¤?..';
      case 'db':
        return 'DB ?€??ì¤?..';
      case 'done':
        return '?€???„ë£Œ';
      case 'error':
        return '?¤ë¥˜ ë°œìƒ';
      default:
        return null;
    }
  }, [submitStage]);

  const messageClassName =
    submitStage === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-600';

  if (!receipt) {
    return (
      <main className="space-y-6">
        <Nav />
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{message ?? '?‘ìˆ˜ ?•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤?..'}</p>
          {errorDetails && (
            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">
                ?¤ë¥˜ ?ì„¸ ë³´ê¸°
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </details>
          )}
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="space-y-6">
        <Nav />
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">?‘ìˆ˜ ?˜ì •</h2>
            <p className="text-sm text-slate-500">?„ìˆ˜ ??ª©ë§??…ë ¥?´ë„ ?€?¥ë©?ˆë‹¤.</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
            className="space-y-5"
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ì°¨ëŸ‰ ?•ë³´</p>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map((brandOption) => (
                  <button
                    key={brandOption}
                    type="button"
                    onClick={() => {
                      setBrand(brandOption);
                      setZtType(null);
                      setModel('');
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      brand === brandOption
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {brandOption}
                  </button>
                ))}
              </div>
              {brand === 'ZT' && (
                <div className="flex flex-wrap gap-2">
                  {ZT_TYPES.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setZtType(option.key);
                        setModel('');
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        ztType === option.key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <label className="flex flex-col gap-1 text-sm">
                ëª¨ë¸ ? íƒ (?„ìˆ˜)
                <select
                  className={inputClassName}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  required
                  disabled={brand === 'ZT' && !ztType}
                >
                  <option value="">
                    {brand === 'ZT' && !ztType ? 'ì¢…ë¥˜ë¥?ë¨¼ì? ? íƒ?˜ì„¸?? : 'ëª¨ë¸??? íƒ?˜ì„¸??}
                  </option>
                  {models.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  ì°¨ëŸ‰ë²ˆí˜¸ (?„ìˆ˜)
                  <input
                    className={inputClassName}
                    value={form.vehicleNumber}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, vehicleNumber: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  ì£¼í–‰ê±°ë¦¬ (km) (?„ìˆ˜)
                  <input
                    type="number"
                    className={inputClassName}
                    value={form.mileageKm}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mileageKm: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ê³ ê° ?•ë³´</p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  ?±ëª…
                  <input
                    className={inputClassName}
                    value={form.customerName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, customerName: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  ?„í™”ë²ˆí˜¸
                  <input
                    className={inputClassName}
                    value={form.phone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="010-1234-5678"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  êµ¬ì…?¼ì
                  <input
                    type="date"
                    className={inputClassName}
                    value={form.purchaseDate}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, purchaseDate: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  ? íƒ??ì°¨ì¢…
                  <input className={`${inputClassName} bg-slate-50 text-slate-500`} value={vehicleName} readOnly />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">?¬ì§„</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium">VIN ?¬ì§„</div>
                  {receipt.vin_image_url ? (
                    <a
                      href={signedVinUrl ?? receipt.vin_image_url}
                      target="_blank"
                      className="text-xs text-slate-600 underline"
                    >
                      ê¸°ì¡´ ?¬ì§„ ë³´ê¸°
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400">?±ë¡???¬ì§„ ?†ìŒ</p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => setVinImage(event.target.files?.[0] ?? null)}
                    className="text-xs"
                  />
                  {vinPreviewUrl && (
                    <img src={vinPreviewUrl} alt="VIN preview" className="h-24 w-full rounded-md object-cover" />
                  )}
                  {vinImage && (
                    <button
                      type="button"
                      onClick={() => setVinImage(null)}
                      className="text-xs text-slate-500 underline"
                    >
                      ?¬ì´¬???¬ì„ ??                    </button>
                  )}
                  {receipt.vin_image_url && (
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={deleteVin}
                        onChange={(event) => setDeleteVin(event.target.checked)}
                      />
                      ê¸°ì¡´ ?¬ì§„ ?? œ
                    </label>
                  )}
                  <p className="text-xs text-slate-500">{vinImage ? vinImage.name : '? íƒ???Œì¼ ?†ìŒ'}</p>
                </div>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium">?”ì§„ë²ˆí˜¸ ?¬ì§„</div>
                  {receipt.engine_image_url ? (
                    <a
                      href={signedEngineUrl ?? receipt.engine_image_url}
                      target="_blank"
                      className="text-xs text-slate-600 underline"
                    >
                      ê¸°ì¡´ ?¬ì§„ ë³´ê¸°
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400">?±ë¡???¬ì§„ ?†ìŒ</p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => setEngineImage(event.target.files?.[0] ?? null)}
                    className="text-xs"
                  />
                  {enginePreviewUrl && (
                    <img src={enginePreviewUrl} alt="Engine preview" className="h-24 w-full rounded-md object-cover" />
                  )}
                  {engineImage && (
                    <button
                      type="button"
                      onClick={() => setEngineImage(null)}
                      className="text-xs text-slate-500 underline"
                    >
                      ?¬ì´¬???¬ì„ ??                    </button>
                  )}
                  {receipt.engine_image_url && (
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={deleteEngine}
                        onChange={(event) => setDeleteEngine(event.target.checked)}
                      />
                      ê¸°ì¡´ ?¬ì§„ ?? œ
                    </label>
                  )}
                  <p className="text-xs text-slate-500">
                    {engineImage ? engineImage.name : '? íƒ???Œì¼ ?†ìŒ'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">?•ë¹„ ?´ìš©</p>
              <label className="flex flex-col gap-1 text-sm">
                ì¦ìƒ
                <textarea
                  className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={form.symptom}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, symptom: event.target.value }))
                  }
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                ?•ë¹„?´ìš©
                <textarea
                  className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={form.serviceDetail}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, serviceDetail: event.target.value }))
                  }
                />
              </label>
            </div>

            {stageLabel && <p className="text-xs text-slate-500">ì§„í–‰ ?¨ê³„: {stageLabel}</p>}
            {message && (
              <div className={messageClassName}>
                <p>{message}</p>
                {requestId && <p className="text-[11px] text-slate-500">requestId: {requestId}</p>}
              </div>
            )}

            {errorDetails && (
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">
                  ?¤ë¥˜ ?ì„¸ ë³´ê¸°
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push('/admin/receipts')}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-600"
              >
                ëª©ë¡?¼ë¡œ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? '?€??ì¤?..' : '?˜ì • ?€??}
              </button>
            </div>
          </form>
        </section>
      </main>
      {showDebugPanel && (
        <DebugPanel logs={logs} title="?‘ìˆ˜ ?˜ì • ë¡œê·¸" onClear={() => setLogs([])} />
      )}
    </>
  );
}
