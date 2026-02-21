import React, { useState } from 'react';
import { X } from 'lucide-react';
import { p } from '../lib/exercises.js';

export default function CustomBuilder({ onStart, onCancel }) {
  const [c, setC] = useState({ name: 'My New Table', in: 4, holdIn: 4, out: 4, holdOut: 0, rest: 0, cycles: 5 });

  const Row = ({ l, f }) => (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-sm">
      <span className="text-slate-400">{l}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => setC(prev => ({ ...prev, [f]: Math.max(0, prev[f] - 1) }))} className="w-8 h-8 rounded-full bg-slate-700">-</button>
        <input
          type="number"
          className="w-16 bg-slate-900/50 border border-slate-700 rounded text-center font-mono text-sky-400 py-1 outline-none"
          value={c[f]}
          onChange={e => setC(prev => ({ ...prev, [f]: parseInt(e.target.value) || 0 }))}
        />
        <button onClick={() => setC(prev => ({ ...prev, [f]: prev[f] + 1 }))} className="w-8 h-8 rounded-full bg-slate-700">+</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">New Table</h2>
        <button onClick={onCancel} className="text-slate-400"><X /></button>
      </div>
      <input
        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 outline-none focus:border-sky-500 text-slate-100"
        value={c.name}
        onChange={e => setC(prev => ({ ...prev, name: e.target.value }))}
      />
      <Row l="Inhale" f="in" />
      <Row l="Hold Full" f="holdIn" />
      <Row l="Exhale" f="out" />
      <Row l="Hold Empty" f="holdOut" />
      <Row l="Rest" f="rest" />
      <div className="pt-2"><Row l="Cycles" f="cycles" /></div>
      <button
        onClick={() => onStart({
          name: c.name,
          params: {
            cycles: p('Cycles', c.cycles, 1, 1),
            in: p('Inhale', c.in),
            holdIn: p('Hold (Full)', c.holdIn),
            out: p('Exhale', c.out),
            holdOut: p('Hold (Empty)', c.holdOut),
            rest: p('Rest Time', c.rest, 5)
          }
        })}
        className="w-full py-4 bg-sky-500 text-slate-900 rounded-xl font-bold shadow-lg"
      >
        Save Table
      </button>
    </div>
  );
}
