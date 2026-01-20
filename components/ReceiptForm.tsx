'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { normalizeVehicleNumber } from '@/lib/normalizeVehicleNumber';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import DebugPanel, { type DebugLogEntry } from '@/components/DebugPanel';

const initialState = {
  vehicleNumber: '',
  mileageKm: '',
  customerName: '',
  phone: '',
  purchaseDate: '',
  symptom: '',
  serviceDetail: ''
};

type SubmitStage = 'idle' | 'vin' | 'engine' | 'db' | 'done' | 'error';

export default function ReceiptForm() {
  const [form, setForm] = useState(initialState);
  const [brand, setBrand] = useState<Brand>('ZT');
  const [model, setModel] = useState('');
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
  const [vinImage, setVinImage] = useState<File | null>(null);
  const [engineImage, setEngineImage] = useState<File | null>(null);
  const [ztType, setZtType] = useState<ZtType | null>(null);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitStage, setSubmitStage] = useState<SubmitStage>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<Record<string, unknown> | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

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

  const addLog = (stage: string, messageText: string) => {
    const time = new Date().toLocaleTimeString('ko-KR');
    setLogs((prev) => [...prev, { time, stage, message: messageText }].slice(-30));
  };

  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    addLog('submit', `단계 시작: ${stages[index]}`);

    stageTimerRef.current = setInterval(() => {
      if (index < stages.length - 1) {
        index += 1;
        setSubmitStage(stages[index]);
        addLog('submit', `단계 이동: ${stages[index]}`);
      }
    }, 1200);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    setAutoFillMessage(null);
    setErrorDetails(null);
    setShowRetry(false);
    startStageProgress();

    if (!vehicleName) {
      setLoading(false);
      setSubmitStage('error');
      setMessage('브랜드와 모델을 선택해주세요.');
      addLog('validation', '브랜드/모델 누락');
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

    if (vinImage) {
      payload.append('vin_image', vinImage);
    }

    if (engineImage) {
      payload.append('engine_image', engineImage);
    }

    addLog('submit', '접수 저장 요청 시작');

    try {
      const response = await fetchWithTimeout('/api/receipts', {
        method: 'POST',
        body: payload
      });

      const result = await response.json();
      clearStageTimer();
      setLoading(false);

      if (!response.ok) {
        setSubmitStage('error');
        setMessage(result.error || result.message || '접수 등록에 실패했습니다.');
        setErrorDetails({
          requestId: result.requestId,
          status: response.status,
          body: result
        });
        addLog('error', `요청 실패: ${result.error || result.message}`);
        return;
      }

      setSubmitStage('done');
      setForm(initialState);
      setBrand('ZT');
      setZtType(null);
      setModel('');
      setHasManualSelection(false);
      setVinImage(null);
      setEngineImage(null);
      setMessage(result.message || '접수 등록이 완료되었습니다.');
      addLog('success', '접수 등록 완료');
    } catch (error) {
      clearStageTimer();
      setLoading(false);
      setSubmitStage('error');
      setShowRetry(true);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage('네트워크/서버 응답이 지연되고 있습니다. 다시 시도해주세요.');
        addLog('timeout', '요청 타임아웃');
      } else {
        setMessage('요청 중 오류가 발생했습니다.');
        addLog('error', '요청 처리 중 예외 발생');
      }
      setErrorDetails({ error });
    }
  };

  const handleDrop =
    (setter: (file: File | null) => void) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0] ?? null;
      if (file) {
        setter(file);
      }
    };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  useEffect(() => {
    if (!autoFillEnabled) {
      return;
    }

    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    const normalized = normalizeVehicleNumber(form.vehicleNumber);
    if (normalized.length < 4) {
      setAutoFillMessage(null);
      return;
    }

    lookupTimeoutRef.current = setTimeout(async () => {
      try {
        addLog('lookup', '차량번호 자동 채움 요청');
        const response = await fetchWithTimeout(
          `/api/receipts/lookup?vehicle_number=${encodeURIComponent(form.vehicleNumber)}`,
          {},
          12000
        );
        const result = await response.json();

        if (!response.ok || !result.found) {
          setAutoFillMessage(null);
          if (!response.ok) {
            addLog('lookup', `조회 실패: ${result.error || result.message || 'unknown'}`);
          }
          return;
        }

        setForm((prev) => ({
          ...prev,
          customerName: prev.customerName || result.data.customer_name || '',
          phone: prev.phone || result.data.phone || '',
          purchaseDate: prev.purchaseDate || result.data.purchase_date || '',
          mileageKm:
            prev.mileageKm || (result.data.mileage_km !== null ? String(result.data.mileage_km) : '')
        }));

        if (!model && result.data.vehicle_name && !hasManualSelection) {
          const parsed = parseVehicleName(result.data.vehicle_name);
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
        }

        setAutoFillMessage('기존 차량 정보가 자동으로 채워졌습니다.');
        addLog('lookup', '자동 채움 완료');
      } catch (error) {
        setAutoFillMessage(null);
        addLog('lookup', '자동 채움 요청 실패');
      }
    }, 600);

    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
    };
  }, [autoFillEnabled, form.vehicleNumber, model, hasManualSelection]);

  const stageLabel = useMemo(() => {
    switch (submitStage) {
      case 'vin':
        return '차대번호 이미지 업로드 중...';
      case 'engine':
        return '엔진번호 이미지 업로드 중...';
      case 'db':
        return 'DB 저장 중...';
      case 'done':
        return '저장 완료';
      case 'error':
        return '오류 발생';
      default:
        return null;
    }
  }, [submitStage]);

  const messageClassName =
    submitStage === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-600';

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>차량번호 자동 채움</span>
          <button
            type="button"
            onClick={() => setAutoFillEnabled((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              autoFillEnabled ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'
            }`}
          >
            {autoFillEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">차량 정보</p>
          <div className="flex flex-wrap gap-2">
            {BRANDS.map((brandOption) => (
              <button
                key={brandOption}
                type="button"
                onClick={() => {
                  setBrand(brandOption);
                  setZtType(null);
                  setModel('');
                  setHasManualSelection(false);
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
                    setHasManualSelection(true);
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
            모델 선택 (필수)
            <select
              className={inputClassName}
              value={model}
              onChange={(event) => {
                setModel(event.target.value);
                setHasManualSelection(true);
              }}
              required
              disabled={brand === 'ZT' && !ztType}
            >
              <option value="">
                {brand === 'ZT' && !ztType ? '차종을 먼저 선택하세요' : '모델을 선택하세요'}
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
              차량번호 (필수)
              <input
                className={inputClassName}
                value={form.vehicleNumber}
                onChange={(event) => updateField('vehicleNumber', event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              주행거리 (km) (필수)
              <input
                type="number"
                className={inputClassName}
                value={form.mileageKm}
                onChange={(event) => updateField('mileageKm', event.target.value)}
                required
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">고객 정보</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              성명
              <input
                className={inputClassName}
                value={form.customerName}
                onChange={(event) => updateField('customerName', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              전화번호
              <input
                className={inputClassName}
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="010-1234-5678"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              구입일자
              <input
                type="date"
                className={inputClassName}
                value={form.purchaseDate}
                onChange={(event) => updateField('purchaseDate', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              선택된 차명
              <input
                className={`${inputClassName} bg-slate-50 text-slate-500`}
                value={vehicleName}
                readOnly
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">사진 업로드</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div
              className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4"
              onDrop={handleDrop(setVinImage)}
              onDragOver={handleDragOver}
            >
              <p className="text-sm font-medium">차대번호 사진</p>
              <p className="text-xs text-slate-500">드래그 또는 클릭하여 업로드</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setVinImage(event.target.files?.[0] ?? null)}
                className="text-xs"
              />
              <p className="text-xs text-slate-500">
                {vinImage ? vinImage.name : '선택된 파일 없음'}
              </p>
            </div>
            <div
              className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4"
              onDrop={handleDrop(setEngineImage)}
              onDragOver={handleDragOver}
            >
              <p className="text-sm font-medium">엔진번호 사진</p>
              <p className="text-xs text-slate-500">드래그 또는 클릭하여 업로드</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setEngineImage(event.target.files?.[0] ?? null)}
                className="text-xs"
              />
              <p className="text-xs text-slate-500">
                {engineImage ? engineImage.name : '선택된 파일 없음'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">정비 내용</p>
          <label className="flex flex-col gap-1 text-sm">
            증상
            <textarea
              className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={form.symptom}
              onChange={(event) => updateField('symptom', event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            정비내용
            <textarea
              className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={form.serviceDetail}
              onChange={(event) => updateField('serviceDetail', event.target.value)}
            />
          </label>
        </div>

        {autoFillMessage && <p className="text-xs text-emerald-600">{autoFillMessage}</p>}
        {stageLabel && <p className="text-xs text-slate-500">진행 단계: {stageLabel}</p>}
        {message && <p className={messageClassName}>{message}</p>}

        {errorDetails && (
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <summary className="cursor-pointer text-xs font-medium text-slate-600">
              오류 상세 보기
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
              {JSON.stringify(errorDetails, null, 2)}
            </pre>
          </details>
        )}

        {showRetry && (
          <button
            type="button"
            onClick={handleSubmit}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-600"
          >
            다시 시도
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? '등록 중...' : '접수 등록'}
        </button>
      </form>
      {showDebugPanel && (
        <DebugPanel
          logs={logs}
          title="접수 등록 로그"
          onClear={() => setLogs([])}
        />
      )}
    </>
  );
}
