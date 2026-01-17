'use client';

import { useState } from 'react';

const initialState = {
  customerName: '',
  phone: '',
  content: ''
};

export default function InquiryForm() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: form.customerName,
        phone: form.phone,
        content: form.content
      })
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.message || '문의 등록에 실패했습니다.');
      return;
    }

    setForm(initialState);
    setMessage('문의가 등록되었습니다.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
      <label className="flex flex-col gap-1 text-sm">
        문의내용
        <textarea
          className="rounded-md border border-slate-200 px-3 py-2"
          rows={4}
          value={form.content}
          onChange={(event) => updateField('content', event.target.value)}
          required
        />
      </label>

      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-slate-900 px-5 py-2 text-white disabled:opacity-50"
      >
        {loading ? '등록 중...' : '문의 등록'}
      </button>
    </form>
  );
}
