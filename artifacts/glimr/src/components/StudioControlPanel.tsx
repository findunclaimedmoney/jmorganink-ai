import React, { useState } from 'react';
import { useStudio } from '@/studio/StudioContext';

const FILTERS = ['Standard', 'Cinema', 'Noir'] as const;
type Filter = (typeof FILTERS)[number];

export default function StudioControlPanel() {
  const engine = useStudio();

  const [processorActive, setProcessorActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('Standard');
  const [fps] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const toggleProcessor = async () => {
    setError(null);
    if (!processorActive) {
      try {
        await engine.initHardware();
        setProcessorActive(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    } else {
      if (engine.stream) {
        engine.stream.getTracks().forEach((t) => t.stop());
      }
      setProcessorActive(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Studio Control Panel</h2>
        <span
          className={`px-2 py-1 text-xs rounded font-mono font-bold tracking-wide ${
            processorActive ? 'bg-green-700 text-green-100' : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}
        >
          {processorActive ? 'ENGINE ONLINE' : 'ENGINE STANDBY'}
        </span>
      </div>

      <button
        onClick={toggleProcessor}
        className={`w-full py-3 rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95 ${
          processorActive
            ? 'bg-red-600 hover:bg-red-500'
            : 'bg-green-700 hover:bg-green-600'
        }`}
      >
        {processorActive ? 'FORCE STOP' : 'ENGAGE ENGINE'}
      </button>

      {error && (
        <div className="mt-3 text-xs text-red-400 font-mono bg-red-950 border border-red-800 px-3 py-2 rounded">
          {error}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-2">Filters</h3>
        <div className="flex space-x-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded text-sm border transition-all ${
                activeFilter === filter
                  ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 font-mono border-t border-gray-800 pt-4 flex justify-between">
        <span>STATUS: {processorActive ? 'ACTIVE_STREAM' : 'READY'}</span>
        <span>FILTER: {activeFilter.toUpperCase()}</span>
        <span>FPS: {fps}</span>
      </div>
    </div>
  );
}
