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

export default function AdminHomePage() {
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

  useEffect(() => {
    const interval = setInterval(() => {
      const current = formatDate(new Date());
      setTodayKey((prev) => (prev === current ? prev : current));
    }, 1000 * 60);

    return () => clearInterval(interval);
  }, []);

  const fetchTodos = async (dateKey: string, setter: (next: TodoState) => void) => {
    setter({ items: [], loading: true, saving: false, error: null, requestId: null });
    const response = await fetch(`/api/todos?date=${encodeURIComponent(dateKey)}`);
    if (response.status === 401) {
      router.replace('/');
      return;
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setter({
        items: [],
        loading: false,
        saving: false,
        error: result.error || result.message || 'Failed to load.',
        requestId: result.requestId || null
      });
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

  useEffect(() => {
    fetchTodos(todayKey, setToday);
  }, [todayKey]);

  useEffect(() => {
    fetchTodos(tomorrowKey, setTomorrow);
  }, [tomorrowKey]);

  const saveTodos = async (dateKey: string, items: string[], setter: (next: TodoState) => void) => {
    setter({ ...today, loading: false, saving: true, error: null, requestId: null });
    const response = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateKey, items })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setter({
        items,
        loading: false,
        saving: false,
        error: result.error || result.message || 'Save failed.',
        requestId: result.requestId || null
      });
      return;
    }
    setter({
      items: result.data?.items ?? items,
      loading: false,
      saving: false,
      error: null,
      requestId: result.requestId || null
    });
  };

  const addTodo = (value: string, list: TodoState, setter: (next: TodoState) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setter({ ...list, items: [...list.items, trimmed] });
  };

  const removeTodo = (index: number, list: TodoState, setter: (next: TodoState) => void) => {
    setter({ ...list, items: list.items.filter((_, idx) => idx !== index) });
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Today</h2>
            <p className="text-xs text-slate-400">{todayKey}</p>
            {today.loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading...</p>
            ) : (
              <div className="mt-4 space-y-3">
                <ul className="space-y-2 text-lg font-semibold">
                  {today.items.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="flex items-center justify-between">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeTodo(idx, today, setToday)}
                        className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Add task"
                    value={todayInput}
                    onChange={(event) => setTodayInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTodo(todayInput, today, setToday);
                      setTodayInput('');
                    }}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                  >
                    Add
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => saveTodos(todayKey, today.items, setToday)}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm"
                  disabled={today.saving}
                >
                  {today.saving ? 'Saving...' : 'Save Today'}
                </button>
                {today.error && (
                  <p className="text-xs text-red-500">
                    {today.error}
                    {today.requestId && <span className="ml-2">requestId: {today.requestId}</span>}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Tomorrow</h3>
            <p className="text-xs text-slate-400">{tomorrowKey}</p>
            {tomorrow.loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading...</p>
            ) : (
              <div className="mt-4 space-y-3">
                <ul className="space-y-2">
                  {tomorrow.items.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="flex items-center justify-between">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeTodo(idx, tomorrow, setTomorrow)}
                        className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Add task"
                    value={tomorrowInput}
                    onChange={(event) => setTomorrowInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTodo(tomorrowInput, tomorrow, setTomorrow);
                      setTomorrowInput('');
                    }}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                  >
                    Add
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => saveTodos(tomorrowKey, tomorrow.items, setTomorrow)}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm"
                  disabled={tomorrow.saving}
                >
                  {tomorrow.saving ? 'Saving...' : 'Save Tomorrow'}
                </button>
                {tomorrow.error && (
                  <p className="text-xs text-red-500">
                    {tomorrow.error}
                    {tomorrow.requestId && <span className="ml-2">requestId: {tomorrow.requestId}</span>}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
