import React, { useEffect, useRef } from "react";
import { Play, RotateCw, Terminal, ShieldCheck } from "lucide-react";

export function AutomationLogs({ logs }) {
  const logOutputRef = useRef(null);
  const latestLog = logs.at(-1);

  useEffect(() => {
    const output = logOutputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [latestLog, logs.length]);

  if (logs.length === 0) return null;
  return (
    <div ref={logOutputRef} className="rounded-xl border border-slate-800 bg-slate-900 text-slate-200 p-3 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
        <Terminal className="w-3 h-3" />
        <span>Playwright Live Output</span>
      </div>
      {logs.map((log, lidx) => (
        <div key={lidx} className="break-words whitespace-pre-wrap leading-tight text-slate-300">
          {log}
        </div>
      ))}
    </div>
  );
}

export function AutomationActions({ onRunAutomation, running, autoSubmit, onToggleAutoSubmit, disabled, buttonLabel }) {
  return (
    <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
      {/* Auto Submit Toggle */}
      {onToggleAutoSubmit && <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span className="font-medium">Auto-Submit after filling</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Auto-Submit after filling"
          aria-checked={autoSubmit}
          onClick={onToggleAutoSubmit}
          className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
            autoSubmit ? "bg-brand-600 justify-end" : "bg-slate-300 justify-start"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
        </button>
      </div>}

      {/* Confirm and Run Button */}
      <button
        onClick={onRunAutomation}
        disabled={running || disabled}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-700 to-brand-600 text-white font-semibold text-sm shadow-md shadow-brand-600/20 hover:from-brand-800 hover:to-brand-700 active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
      >
        {running ? (
          <>
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>Filling the form...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-white" />
            <span>{buttonLabel}</span>
          </>
        )}
      </button>
    </div>
  );
}
