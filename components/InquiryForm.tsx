'use client';

import { useState } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const initialState = {
  customerName: '',
  phone: '',
  content: ''
};

type SubmitStage = 'idle' | 'db' | 'done' | 'error';

export default function InquiryForm() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<Record<string, unknown> | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [submitStage, setSubmitStage] = useState<SubmitStage>('idle');
  const inputClassName =
    'h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

  const updateField = (key: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setLoading(true);
    setMessage(null);
    setErrorDetails(null);
    setRequestId(null);
    setShowRetry(false);
    setSubmitStage('db');

    try {
      const response = await fetchWithTimeout('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customerName,
          phone: form.phone,
          content: form.content
        })
      });

      const result = await response.json();
      setRequestId(result.requestId || null);

      if (!response.ok) {
        setSubmitStage('error');
        setMessage(result.error || result.message || '문의 등록에 실패했습니다.');
        setErrorDetails({
          requestId: result.requestId,
          status: response.status,
          body: result
        });
        setShowRetry(true);
        return;
      }

      setForm(initialState);
      setSubmitStage('done');
      setMessage('문의가 등록되었습니다.');
    } catch (error) {
      setSubmitStage('error');
      setShowRetry(true);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage('네트워크/서버 응답이 지연되고 있습니다. 다시 시도해주세요.');
      } else {
        setMessage('요청 중 오류가 발생했습니다.');
      }
      setErrorDetails({ error });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit();
  };

  const stageLabel = submitStage === 'db' ? 'DB 저장 중...' : null;
  const messageClassName =
    submitStage === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-600';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">고객 정보</p>
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
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">문의 내용</p>
        <label className="flex flex-col gap-1 text-sm">
          문의내용
          <textarea
            className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={form.content}
            onChange={(event) => updateField('content', event.target.value)}
            required
          />
        </label>
      </div>

      {stageLabel && <p className="text-xs text-slate-500">진행 단계: {stageLabel}</p>}
      {message && (
        <div className={messageClassName}>
          <p>{message}</p>
          {requestId && <p className="text-[11px] text-slate-500">requestId: {requestId}</p>}
        </div>
      )}

      {errorDetails && (
        <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">오류 상세 보기</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
            {JSON.stringify(errorDetails, null, 2)}
          </pre>
        </details>
      )}

      {showRetry && (
        <button
          type="button"
          onClick={submit}
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
        {loading ? '저장 중...' : '문의 등록'}
      </button>
    </form>
  );
}
