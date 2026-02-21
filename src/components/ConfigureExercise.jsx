import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getGenerator } from '../lib/exercises.js';

export default function ConfigureExercise({ template, onStart, onCancel, onUpdateTemplate }) {
  const [params, setParams] = useState(template.params);
  const [name, setName] = useState(template.name);

  const update = (k, v) =>
    setParams(prev => ({ ...prev, [k]: { ...prev[k], value: Math.max(prev[k].min || 0, v) } }));

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <input
          className="text-xl font-bold bg-transparent border-b border-slate-700 focus:border-sky-500 outline-none w-full py-1 text-slate-100"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button onClick={onCancel} className="text-slate-400"><X size={20} /></button>
      </div>

      <div className="space-y-2">
        {Object.entries(params).map(([key, param]) => (
          <div
            key={key}
            className={`flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700 ${key === 'cycles' ? 'ring-1 ring-sky-500/30' : ''}`}
          >
            <span className="text-slate-400 text-sm">{param.label}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => update(key, param.value - (param.step || 1))} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300">-</button>
              <input
                type="number"
                className="w-16 bg-slate-900/50 border border-slate-700 rounded text-center text-sm font-mono text-sky-400 py-1 outline-none focus:border-sky-500"
                value={param.value}
                onChange={e => update(key, parseInt(e.target.value) || 0)}
              />
              <button onClick={() => update(key, param.value + (param.step || 1))} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300">+</button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const updated = { ...template, name, params };
          onUpdateTemplate(updated);
          onStart({ ...updated, cycles: getGenerator(template, params) });
        }}
        className="w-full py-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-lg shadow-lg"
      >
        Start Breathing
      </button>
    </div>
  );
}
