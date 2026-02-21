import React from 'react';
import { CheckCircle2 } from 'lucide-react';

function getSettingsSummary(params) {
  if (!params) return '';
  const parts = [];
  if (params.in?.value > 0) parts.push(`I:${params.in.value}s`);
  if (params.startIn?.value > 0) parts.push(`I:${params.startIn.value}→${params.targetIn?.value}s`);
  if (params.holdIn?.value > 0) parts.push(`F:${params.holdIn.value}s`);
  if (params.startHoldIn?.value > 0) parts.push(`F:${params.startHoldIn.value}→${params.targetHoldIn?.value}s`);
  if (params.out?.value > 0) parts.push(`E:${params.out.value}s`);
  if (params.startOut?.value > 0) parts.push(`E:${params.startOut.value}→${params.targetOut?.value}s`);
  if (params.holdOut?.value > 0) parts.push(`H:${params.holdOut.value}s`);
  if (params.startHoldOut?.value > 0) parts.push(`H:${params.startHoldOut.value}→${params.targetHoldOut?.value}s`);
  if (params.startRest?.value > 0 && params.targetRest?.value !== undefined) {
    parts.push(`R:${params.startRest.value}→${params.targetRest.value}s`);
  } else if (params.rest?.value > 0) {
    parts.push(`R:${params.rest.value}s`);
  }
  return parts.join(' • ');
}

export default function SessionLog({ logs }) {
  if (logs.length === 0) {
    return <div className="text-center py-20 text-slate-600 italic">History will appear after your first session.</div>;
  }

  return (
    <div className="space-y-3 animate-in fade-in">
      <h2 className="text-xl font-bold mb-4">Activity Log</h2>
      {logs.map(log => {
        const d = new Date(log.date);
        return (
          <div key={log.id} className="flex flex-col p-4 bg-slate-800/60 border border-slate-700 rounded-2xl gap-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-400 rounded-full"><CheckCircle2 size={16} /></div>
                <div>
                  <h3 className="font-medium text-slate-200 text-sm">{log.exerciseName}</h3>
                  <p className="text-[10px] text-slate-500 uppercase">
                    {d.toLocaleDateString()} • {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-lg font-bold text-sky-400 leading-none">{log.totalCycles}</span>
                <span className="text-[8px] uppercase text-slate-600 tracking-wider">Cycles</span>
              </div>
            </div>
            {log.settings && (
              <div className="mt-1 px-2 py-1.5 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-[10px] font-mono text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
                  {getSettingsSummary(log.settings)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
