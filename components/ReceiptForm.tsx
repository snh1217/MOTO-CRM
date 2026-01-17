'use client';

import { useState } from 'react';

const initialState = {
  vehicleName: '',
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
  const [vinImage, setVinImage] = useState<File | null>(null);
  const [engineImage, setEngineImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = new FormData();
    payload.append('vehicle_name', form.vehicleName);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          차명
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            value={form.vehicleName}
            onChange={(event) => updateField('vehicleName', event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          차량번호
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            value={form.vehicleNumber}
            onChange={(event) => updateField('vehicleNumber', event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          주행거리 (km)
          <input
            type="number"
            className="rounded-md border border-slate-200 px-3 py-2"
            value={form.mileageKm}
            onChange={(event) => updateField('mileageKm', event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          성명
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            value={form.customerName}
            onChange={(event) => updateField('customerName', event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          전화번호
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
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
            className="rounded-md border border-slate-200 px-3 py-2"
            value={form.purchaseDate}
            onChange={(event) => updateField('purchaseDate', event.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          className="rounded-lg border border-dashed border-slate-300 bg-white p-4"
          onDrop={handleDrop(setVinImage)}
          onDragOver={handleDragOver}
        >
          <p className="text-sm font-medium">차대번호 사진</p>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setVinImage(event.target.files?.[0] ?? null)}
            className="mt-2"
          />
          {vinImage && <p className="mt-2 text-xs text-slate-500">{vinImage.name}</p>}
        </div>
        <div
          className="rounded-lg border border-dashed border-slate-300 bg-white p-4"
          onDrop={handleDrop(setEngineImage)}
          onDragOver={handleDragOver}
        >
          <p className="text-sm font-medium">엔진번호 사진</p>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setEngineImage(event.target.files?.[0] ?? null)}
            className="mt-2"
          />
          {engineImage && (
            <p className="mt-2 text-xs text-slate-500">{engineImage.name}</p>
          )}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        증상
        <textarea
          className="rounded-md border border-slate-200 px-3 py-2"
          rows={3}
          value={form.symptom}
          onChange={(event) => updateField('symptom', event.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        정비내용
        <textarea
          className="rounded-md border border-slate-200 px-3 py-2"
          rows={3}
          value={form.serviceDetail}
          onChange={(event) => updateField('serviceDetail', event.target.value)}
          required
        />
      </label>

      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-slate-900 px-5 py-2 text-white disabled:opacity-50"
      >
        {loading ? '등록 중...' : '접수 등록'}
      </button>
    </form>
  );
}
