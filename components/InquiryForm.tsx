'use client';

import { useState } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import DebugPanel, { type DebugLogEntry } from '@/components/DebugPanel';
import { strings } from '@/lib/strings.ko';

export default function InquiryForm() {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);

  const addLog = (stage: string, messageText: string) => {
    const time = new Date().toLocaleTimeString('ko-KR');
    setLogs((prev) => [...prev, { time, stage, message: messageText }].slice(-30));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setRequestId(null);

    try {
      addLog('submit', '문의 저장 요청 시작');
      const response = await fetchWithTimeout('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          phone,
          content
        })
      });

      const result = await response.json();
      setRequestId(result.requestId || null);

      if (!response.ok) {
        setMessage(result.error || result.message || '문의 등록에 실패했습니다.');
        addLog('error', `요청 실패: ${result.error || result.message}`);
        return;
      }

      setCustomerName('');
      setPhone('');
      setContent('');
      setMessage(result.message || '문의가 등록되었습니다.');
      addLog('success', '문의 등록 완료');
    } catch (error) {
      setMessage('요청 중 오류가 발생했습니다.');
      addLog('error', '요청 처리 중 예외 발생');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          성명
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          전화번호
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="010-1234-5678"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          문의 내용
          <textarea
            className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
          />
        </label>
        {message && (
          <div className="text-sm text-slate-600">
            <p>{message}</p>
            {requestId && <p className="text-[11px] text-slate-500">requestId: {requestId}</p>}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? '저장 중...' : strings.inquiry.title}
        </button>
      </form>
      {showDebugPanel && <DebugPanel logs={logs} title="문의 등록 로그" onClear={() => setLogs([])} />}
    </>
  );
}
