'use client';

import { useState } from 'react';
import { BRANDS, type Brand, getModelsByBrand } from '@/lib/models';

const initialState = {
  vehicleNumber: '',
  mileageKm: '',
  customerName: '',
  phone: '',
  purchaseDate: '',
  symptom: '',
  serviceDetail: ''
};

export default function ReceiptForm() {
  const [form, setForm] = useState(initialState);
  const [brand, setBrand] = useState<Brand>('ZT');
  const [model, setModel] = useState('');
  const [vinImage, setVinImage] = useState<File | null>(null);
  const [engineImage, setEngineImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const models = getModelsByBrand(brand);
  const vehicleName = model ? `${brand} ${model}` : '';
  const inputClassName =
    'h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!vehicleName) {
      setLoading(false);
      setMessage('브랜드와 모델을 선택해주세요.');
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

    const response = await fetch('/api/receipts', {
      method: 'POST',
      body: payload
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.message || '접수 등록에 실패했습니다.');
      return;
    }

    setForm(initialState);
    setBrand('ZT');
    setModel('');
    setVinImage(null);
    setEngineImage(null);
    setMessage('접수 등록이 완료되었습니다.');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          차량 정보
        </p>
        <div className="flex flex-wrap gap-2">
          {BRANDS.map((brandOption) => (
            <button
              key={brandOption}
              type="button"
              onClick={() => {
                setBrand(brandOption);
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
        <label className="flex flex-col gap-1 text-sm">
          모델 선택
          <select
            className={inputClassName}
            value={model}
            onChange={(event) => setModel(event.target.value)}
            required
          >
            <option value="">모델을 선택하세요</option>
            {models.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            차량번호
            <input
              className={inputClassName}
              value={form.vehicleNumber}
              onChange={(event) => updateField('vehicleNumber', event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            주행거리 (km)
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          고객 정보
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            성명
            <input
              className={inputClassName}
              value={form.customerName}
              onChange={(event) => updateField('customerName', event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            전화번호
            <input
              className={inputClassName}
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="010-1234-5678"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            구입일자
            <input
              type="date"
              className={inputClassName}
              value={form.purchaseDate}
              onChange={(event) => updateField('purchaseDate', event.target.value)}
              required
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          사진 업로드
        </p>
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          정비 내용
        </p>
        <label className="flex flex-col gap-1 text-sm">
          증상
          <textarea
            className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={form.symptom}
            onChange={(event) => updateField('symptom', event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          정비내용
          <textarea
            className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={form.serviceDetail}
            onChange={(event) => updateField('serviceDetail', event.target.value)}
            required
          />
        </label>
      </div>

      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? '등록 중...' : '접수 등록'}
      </button>
    </form>
  );
}
