'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { strings } from '@/lib/strings.ko';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

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

  const fetchTodos = async (dateKey: string, setter: Dispatch<SetStateAction<TodoState>>) => {
    setter({ items: [], loading: true, saving: false, error: null, requestId: null });

    try {
      const response = await fetchWithTimeout(
        `/api/todos?date=${encodeURIComponent(dateKey)}`,
        { credentials: 'include' },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/');
        return;
      }
      if (!response.ok) {
        setter({
          items: [],
          loading: false,
          saving: false,
          error: result.error || result.message || strings.todos.fetchFailed,
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
    } catch (error) {
      setter({
        items: [],
        loading: false,
        saving: false,
        error: strings.todos.fetchFailed,
        requestId: null
      });
    }
  };

  useEffect(() => {
    fetchTodos(todayKey, setToday);
  }, [todayKey]);

  useEffect(() => {
    fetchTodos(tomorrowKey, setTomorrow);
  }, [tomorrowKey]);

  const saveTodos = async (
    dateKey: string,
    items: string[],
    setter: Dispatch<SetStateAction<TodoState>>
  ) => {
    setter((prev) => ({ ...prev, saving: true, error: null, requestId: null }));
    const response = await fetchWithTimeout(
      '/api/todos',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey, items }),
        credentials: 'include'
      },
      12000
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setter({
        items,
        loading: false,
        saving: false,
        error: result.error || result.message || strings.todos.saveFailed,
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

  const addTodo = (
    value: string,
    list: TodoState,
    setter: Dispatch<SetStateAction<TodoState>>
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setter({ ...list, items: [...list.items, trimmed] });
  };

  const removeTodo = (
    index: number,
    list: TodoState,
    setter: Dispatch<SetStateAction<TodoState>>
  ) => {
    setter({ ...list, items: list.items.filter((_, idx) => idx !== index) });
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{strings.todos.today}</h2>
            <p className="text-xs text-slate-400">{todayKey}</p>
            {today.loading ? (
              <p className="mt-4 text-sm text-slate-500">{strings.todos.loading}</p>
            ) : (
              <div className="mt-4 space-y-3">
                <ul className="space-y-2 text-lg font-semibold">
                  {today.items.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="flex items-center justify-between">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeTodo(idx, today, setToday)}
                        className="whitespace-nowrap rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                      >
                        {strings.todos.remove}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    className="h-11 flex-1 rounded-md border border-slate-200 px-3 text-sm"
                    placeholder={strings.todos.addPlaceholder}
                    value={todayInput}
                    onChange={(event) => setTodayInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTodo(todayInput, today, setToday);
                      setTodayInput('');
                    }}
                    className="h-11 rounded-md bg-slate-900 px-4 text-sm text-white"
                  >
                    {strings.todos.add}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => saveTodos(todayKey, today.items, setToday)}
                  className="h-11 rounded-md border border-slate-200 px-4 text-sm"
                  disabled={today.saving}
                >
                  {today.saving ? strings.todos.saving : strings.todos.saveToday}
                </button>
                {today.error && (
                  <div className="text-xs text-red-500">
                    <p>{today.error}</p>
                    {today.requestId && <p className="mt-1">requestId: {today.requestId}</p>}
                    <button
                      type="button"
                      onClick={() => fetchTodos(todayKey, setToday)}
                      className="mt-2 rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      {strings.todos.retry}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{strings.todos.tomorrow}</h3>
            <p className="text-xs text-slate-400">{tomorrowKey}</p>
            {tomorrow.loading ? (
              <p className="mt-4 text-sm text-slate-500">{strings.todos.loading}</p>
            ) : (
              <div className="mt-4 space-y-3">
                <ul className="space-y-2">
                  {tomorrow.items.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="flex items-center justify-between">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeTodo(idx, tomorrow, setTomorrow)}
                        className="whitespace-nowrap rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                      >
                        {strings.todos.remove}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    className="h-11 flex-1 rounded-md border border-slate-200 px-3 text-sm"
                    placeholder={strings.todos.addPlaceholder}
                    value={tomorrowInput}
                    onChange={(event) => setTomorrowInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTodo(tomorrowInput, tomorrow, setTomorrow);
                      setTomorrowInput('');
                    }}
                    className="h-11 rounded-md bg-slate-900 px-4 text-sm text-white"
                  >
                    {strings.todos.add}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => saveTodos(tomorrowKey, tomorrow.items, setTomorrow)}
                  className="h-11 rounded-md border border-slate-200 px-4 text-sm"
                  disabled={tomorrow.saving}
                >
                  {tomorrow.saving ? strings.todos.saving : strings.todos.saveTomorrow}
                </button>
                {tomorrow.error && (
                  <div className="text-xs text-red-500">
                    <p>{tomorrow.error}</p>
                    {tomorrow.requestId && <p className="mt-1">requestId: {tomorrow.requestId}</p>}
                    <button
                      type="button"
                      onClick={() => fetchTodos(tomorrowKey, setTomorrow)}
                      className="mt-2 rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      {strings.todos.retry}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
