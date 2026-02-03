'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type TodoState = {
  items: string[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  requestId: string | null;
};

export default function HomePage() {
  const router = useRouter();
  const [todayKey, setTodayKey] = useState(() => formatDate(new Date()));
  const [today, setToday] = useState<TodoState>({
    items: [],
    loading: true,
    saving: false,
    error: null,
    requestId: null
  });
  const [tomorrow, setTomorrow] = useState<TodoState>({
    items: [],
    loading: true,
    saving: false,
    error: null,
    requestId: null
  });
  const [todayInput, setTodayInput] = useState('');
  const [tomorrowInput, setTomorrowInput] = useState('');

  const tomorrowKey = useMemo(() => {
    const date = new Date(todayKey);
    date.setDate(date.getDate() + 1);
    return formatDate(date);
  }, [todayKey]);

  const fetchTodos = async (
    dateKey: string,
    setter: React.Dispatch<React.SetStateAction<TodoState>>
  ) => {
    setter((prev) => ({ ...prev, loading: true, error: null, requestId: null }));
    const response = await fetch(`/api/todos?date=${encodeURIComponent(dateKey)}`);
    if (response.status === 401) {
      router.replace('/admin');
      return;
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setter((prev) => ({
        ...prev,
        loading: false,
        error: result.error || '??? ???? ?????.',
        requestId: result.requestId || null
      }));
      return;
    }
    setter({
      items: result.data?.items ?? [],
      loading: false,
      saving: false,
      error: null,
      requestId: result.requestId || null
    });
  };

  const saveTodos = async (
    dateKey: string,
    items: string[],
    setter: React.Dispatch<React.SetStateAction<TodoState>>
  ) => {
    setter((prev) => ({ ...prev, saving: true, error: null, requestId: null }));
    const response = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateKey, items })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setter((prev) => ({
        ...prev,
        saving: false,
        error: result.error || '??? ??????.',
        requestId: result.requestId || null
      }));
      return;
    }
    setter((prev) => ({
      ...prev,
      items: result.data?.items ?? items,
      saving: false,
      error: null,
      requestId: result.requestId || null
    }));
  };

  useEffect(() => {
    fetchTodos(todayKey, setToday);
    fetchTodos(tomorrowKey, setTomorrow);
  }, [todayKey, tomorrowKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextKey = formatDate(new Date());
      if (nextKey !== todayKey) {
        setTodayKey(nextKey);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [todayKey]);

  const handleAdd = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<TodoState>>,
    clear: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setter((prev) => ({ ...prev, items: [...prev.items, trimmed] }));
    clear();
  };

  const removeItem = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<TodoState>>
  ) => {
    setter((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">?? ? ?</h2>
          <p className="mt-1 text-sm text-slate-500">{todayKey}</p>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={todayInput}
              onChange={(event) => setTodayInput(event.target.value)}
              placeholder="?? ? ?? ?????"
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-base"
            />
            <button
              type="button"
              onClick={() => handleAdd(todayInput, setToday, () => setTodayInput(''))}
              className="min-h-[44px] rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              ??
            </button>
            <button
              type="button"
              onClick={() => saveTodos(todayKey, today.items, setToday)}
              className="min-h-[44px] rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600"
              disabled={today.saving}
            >
              {today.saving ? '?? ?...' : '??'}
            </button>
          </div>
          {today.loading ? (
            <p className="text-sm text-slate-500">???? ?...</p>
          ) : (
            <ul className="space-y-2 text-lg">
              {today.items.length === 0 && (
                <li className="text-sm text-slate-400">??? ? ?? ????.</li>
              )}
              {today.items.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(index, setToday)}
                    className="text-xs text-rose-500"
                  >
                    ??
                  </button>
                </li>
              ))}
            </ul>
          )}
          {today.error && (
            <p className="text-xs text-rose-600">
              {today.error}
              {today.requestId && <span className="ml-2">requestId: {today.requestId}</span>}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold">?? ? ?</h3>
          <p className="mt-1 text-sm text-slate-500">{tomorrowKey}</p>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={tomorrowInput}
              onChange={(event) => setTomorrowInput(event.target.value)}
              placeholder="?? ? ?? ?????"
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-base"
            />
            <button
              type="button"
              onClick={() => handleAdd(tomorrowInput, setTomorrow, () => setTomorrowInput(''))}
              className="min-h-[44px] rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              ??
            </button>
            <button
              type="button"
              onClick={() => saveTodos(tomorrowKey, tomorrow.items, setTomorrow)}
              className="min-h-[44px] rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600"
              disabled={tomorrow.saving}
            >
              {tomorrow.saving ? '?? ?...' : '??'}
            </button>
          </div>
          {tomorrow.loading ? (
            <p className="text-sm text-slate-500">???? ?...</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {tomorrow.items.length === 0 && (
                <li className="text-sm text-slate-400">??? ? ?? ????.</li>
              )}
              {tomorrow.items.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(index, setTomorrow)}
                    className="text-xs text-rose-500"
                  >
                    ??
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tomorrow.error && (
            <p className="text-xs text-rose-600">
              {tomorrow.error}
              {tomorrow.requestId && <span className="ml-2">requestId: {tomorrow.requestId}</span>}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
