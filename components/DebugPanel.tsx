'use client';

import { useState } from 'react';

export type DebugLogEntry = {
  time: string;
  stage: string;
  message: string;
};

type DebugPanelProps = {
  logs: DebugLogEntry[];
  title?: string;
  onClear?: () => void;
};

export default function DebugPanel({ logs, title = '디버그 로그', onClear }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow"
      >
        디버그
      </button>
      {open && (
        <div className="w-80 max-w-[90vw] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-700">{title}</p>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                비우기
              </button>
            )}
          </div>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-slate-400">로그가 없습니다.</p>
            ) : (
              logs.map((log, index) => (
                <div key={`${log.time}-${index}`} className="rounded border border-slate-100 p-2">
                  <p className="text-[10px] uppercase text-slate-400">{log.time}</p>
                  <p className="font-medium text-slate-600">[{log.stage}]</p>
                  <p className="text-slate-500">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
