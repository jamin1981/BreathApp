import React, { useState } from 'react';
import { Plus, Star, Settings2, Trash2, GripVertical, ChevronDown, ChevronRight, Edit3, Play } from 'lucide-react';

export default function ExerciseList({
  exercises, categories, collapsedCats = [], onSelect, onQuickStart, onGoCustom,
  starredIds, onToggleStar, onDelete, onRenameCategory, onDeleteCategory,
  onMoveExercise, onToggleCollapse, hideControls
}) {
  const [editingCat, setEditingCat] = useState(null);
  const [editVal, setEditVal] = useState('');

  const handleDragStart = (e, id) => e.dataTransfer.setData('exId', id);
  const handleDrop = (e, cat, targetIdx) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('exId');
    if (onMoveExercise) onMoveExercise(id, cat, targetIdx);
  };

  return (
    <div className="space-y-6">
      {!hideControls && (
        <button
          onClick={onGoCustom}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition-all font-medium"
        >
          <Plus size={20} /> New Breath Table
        </button>
      )}

      {categories.map(cat => {
        const isCollapsed = collapsedCats.includes(cat);
        const catEx = exercises.filter(e => e.category === cat);
        return (
          <div key={cat} className="space-y-2" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, cat)}>
            <div className="flex items-center justify-between group px-1">
              <div className="flex items-center gap-2 flex-1">
                <button onClick={() => onToggleCollapse?.(cat)} className="text-slate-500 hover:text-white transition-colors">
                  {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                </button>
                {editingCat === cat ? (
                  <input
                    autoFocus
                    className="bg-slate-800 border-b border-sky-500 text-xs font-bold uppercase tracking-wider outline-none text-slate-100"
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={() => { onRenameCategory(cat, editVal); setEditingCat(null); }}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                ) : (
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat}</h2>
                )}
                {!hideControls && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCat(cat); setEditVal(cat); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-sky-400 transition-all"><Edit3 size={12} /></button>
                    <button onClick={() => onDeleteCategory(cat)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-600 font-mono">{catEx.length}</span>
            </div>

            {!isCollapsed && (
              <div className="grid gap-2">
                {catEx.map((ex, idx) => (
                  <div
                    key={ex.id}
                    draggable={!hideControls}
                    onDragStart={e => handleDragStart(e, ex.id)}
                    onDrop={e => { e.stopPropagation(); handleDrop(e, cat, idx); }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700 hover:bg-slate-700/50 transition-all text-left group cursor-pointer"
                    onClick={() => onSelect(ex)}
                  >
                    <div className="flex items-center gap-3">
                      {!hideControls && <GripVertical size={16} className="text-slate-600 cursor-grab" />}
                      {onQuickStart && (
                        <button
                          onClick={e => { e.stopPropagation(); onQuickStart(ex); }}
                          className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 active:scale-95 flex items-center justify-center text-slate-900 transition-all shadow-md"
                        >
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        </button>
                      )}
                      <h3 className="font-medium text-slate-200">{ex.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); onToggleStar(ex.id); }} className="p-2 text-slate-500 hover:text-yellow-400 transition-colors">
                        <Star size={18} className={starredIds.includes(ex.id) ? 'fill-yellow-400 text-yellow-400' : ''} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); onSelect(ex); }} className="p-2 text-sky-400">
                        <Settings2 size={18} />
                      </button>
                      {!hideControls && (
                        <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) onDelete(ex.id); }} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
