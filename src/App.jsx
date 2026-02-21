import React, { useState, useEffect } from 'react';
import { Wind, Star, List, Activity } from 'lucide-react';
import {
  initDB, getAllData, saveData, deleteData, getVal,
  STORE_LOGS, STORE_SETTINGS, STORE_EXERCISES
} from './lib/db.js';
import { DEFAULT_EXERCISES, getGenerator } from './lib/exercises.js';
import ExerciseList from './components/ExerciseList.jsx';
import ConfigureExercise from './components/ConfigureExercise.jsx';
import CustomBuilder from './components/CustomBuilder.jsx';
import Player from './components/Player.jsx';
import SessionLog from './components/SessionLog.jsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState('starred');
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedExerciseTemplate, setSelectedExerciseTemplate] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [logs, setLogs] = useState([]);
  const [starredIds, setStarredIds] = useState([]);
  const [collapsedCats, setCollapsedCats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        let savedEx = await getAllData(STORE_EXERCISES);
        if (savedEx.length === 0) {
          for (const ex of DEFAULT_EXERCISES) await saveData(STORE_EXERCISES, null, ex);
          savedEx = await getAllData(STORE_EXERCISES);
        }
        const savedLogs = await getAllData(STORE_LOGS);
        const savedStarred = await getVal(STORE_SETTINGS, 'starredIds');
        const savedCats = await getVal(STORE_SETTINGS, 'categories');
        const savedCollapsed = await getVal(STORE_SETTINGS, 'collapsedCats');

        setExercises(savedEx.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        setLogs(savedLogs.sort((a, b) => new Date(b.date) - new Date(a.date)));
        if (savedStarred) setStarredIds(savedStarred);
        if (savedCollapsed) setCollapsedCats(savedCollapsed);

        const uniqueCats = [...new Set(savedEx.map(e => e.category))];
        setCategories(savedCats || uniqueCats);
      } catch (err) {
        // DB load error — app still usable with empty state
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleToggleStar = async (id) => {
    const next = starredIds.includes(id)
      ? starredIds.filter(s => s !== id)
      : [...starredIds, id];
    setStarredIds(next);
    await saveData(STORE_SETTINGS, 'starredIds', next);
  };

  const handleToggleCollapse = async (cat) => {
    const next = collapsedCats.includes(cat)
      ? collapsedCats.filter(c => c !== cat)
      : [...collapsedCats, cat];
    setCollapsedCats(next);
    await saveData(STORE_SETTINGS, 'collapsedCats', next);
  };

  const handleRenameCategory = async (oldName, newName) => {
    if (!newName || oldName === newName) return;
    const nextCats = categories.map(c => (c === oldName ? newName : c));
    setCategories(nextCats);
    await saveData(STORE_SETTINGS, 'categories', nextCats);
    const updated = exercises.map(ex => {
      if (ex.category !== oldName) return ex;
      const n = { ...ex, category: newName };
      saveData(STORE_EXERCISES, null, n);
      return n;
    });
    setExercises(updated);
  };

  const handleDeleteCategory = async (catName) => {
    if (!confirm(`Delete folder "${catName}" and all tables inside?`)) return;
    const toDelete = exercises.filter(e => e.category === catName);
    for (const ex of toDelete) await deleteData(STORE_EXERCISES, ex.id);
    setExercises(exercises.filter(e => e.category !== catName));
    const nextCats = categories.filter(c => c !== catName);
    setCategories(nextCats);
    await saveData(STORE_SETTINGS, 'categories', nextCats);
  };

  const handleMoveExercise = async (exId, newCat, targetIndex) => {
    const list = [...exercises];
    const itemIdx = list.findIndex(e => e.id === exId);
    if (itemIdx === -1) return;
    const item = { ...list[itemIdx], category: newCat };
    list.splice(itemIdx, 1);
    const catItems = list.filter(e => e.category === newCat);
    const targetIdxInFull = targetIndex !== undefined && catItems[targetIndex]
      ? list.indexOf(catItems[targetIndex])
      : list.length;
    list.splice(targetIdxInFull === -1 ? list.length : targetIdxInFull, 0, item);
    const finalized = list.map((e, i) => ({ ...e, sortOrder: i }));
    setExercises(finalized);
    for (const ex of finalized) await saveData(STORE_EXERCISES, null, ex);
  };

  const handleDeleteExercise = (id) => {
    deleteData(STORE_EXERCISES, id);
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const handleFinishSession = async (logEntry) => {
    setLogs(prev => [logEntry, ...prev]);
    await saveData(STORE_LOGS, null, logEntry);
    setCurrentTab('log');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Wind className="text-sky-400 animate-pulse" size={48} />
      </div>
    );
  }

  const starredExercises = exercises.filter(e => starredIds.includes(e.id));
  const starredCategories = [...new Set(starredExercises.map(e => e.category))];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      <header className="bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="text-sky-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight">PranaFlow</h1>
          </div>
          <nav className="flex gap-4">
            <button
              onClick={() => setCurrentTab('starred')}
              className={`p-2 rounded-full transition-colors ${currentTab === 'starred' ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400'}`}
            >
              <Star size={20} />
            </button>
            <button
              onClick={() => setCurrentTab('exercises')}
              className={`p-2 rounded-full transition-colors ${currentTab === 'exercises' ? 'text-sky-400 bg-sky-400/10' : 'text-slate-400'}`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setCurrentTab('log')}
              className={`p-2 rounded-full transition-colors ${currentTab === 'log' ? 'text-sky-400 bg-sky-400/10' : 'text-slate-400'}`}
            >
              <Activity size={20} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        {currentTab === 'exercises' && (
          <ExerciseList
            exercises={exercises}
            categories={categories}
            collapsedCats={collapsedCats}
            onSelect={(t) => { setSelectedExerciseTemplate(t); setCurrentTab('configure'); }}
            onGoCustom={() => setCurrentTab('custom')}
            starredIds={starredIds}
            onToggleStar={handleToggleStar}
            onToggleCollapse={handleToggleCollapse}
            onDelete={handleDeleteExercise}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
            onMoveExercise={handleMoveExercise}
          />
        )}

        {currentTab === 'starred' && (
          <ExerciseList
            exercises={starredExercises}
            categories={starredCategories}
            onSelect={(t) => { setSelectedExerciseTemplate(t); setCurrentTab('configure'); }}
            starredIds={starredIds}
            onToggleStar={handleToggleStar}
            hideControls
          />
        )}

        {currentTab === 'configure' && selectedExerciseTemplate && (
          <ConfigureExercise
            template={selectedExerciseTemplate}
            onStart={(ex) => { setSelectedExercise(ex); setCurrentTab('player'); }}
            onCancel={() => setCurrentTab('exercises')}
            onUpdateTemplate={async (updated) => {
              await saveData(STORE_EXERCISES, null, updated);
              setExercises(exercises.map(e => (e.id === updated.id ? updated : e)));
            }}
          />
        )}

        {currentTab === 'custom' && (
          <CustomBuilder
            onStart={async (ex) => {
              const template = {
                id: 'custom-' + Date.now(),
                name: ex.name,
                category: 'Custom',
                params: ex.params,
                sortOrder: exercises.length
              };
              await saveData(STORE_EXERCISES, null, template);
              setExercises([...exercises, template]);
              setSelectedExercise({ ...template, cycles: getGenerator(template, ex.params) });
              setCurrentTab('player');
            }}
            onCancel={() => setCurrentTab('exercises')}
          />
        )}

        {currentTab === 'player' && selectedExercise && (
          <Player
            exercise={selectedExercise}
            onClose={() => setCurrentTab('exercises')}
            onFinish={handleFinishSession}
          />
        )}

        {currentTab === 'log' && <SessionLog logs={logs} />}
      </main>
    </div>
  );
}
