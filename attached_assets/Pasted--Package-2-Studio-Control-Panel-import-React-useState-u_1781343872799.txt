/* Package 2: Studio Control Panel */
import React, { useState, useEffect } from 'react';
import { useStudio } from './studio/StudioContext';

export default function StudioControlPanel() {
  const engine = useStudio();
  
  // -- Control State --
  const [processorActive, setProcessorActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Standard");
  const [fps, setFps] = useState(60);

  // -- Engine Interaction --
  const toggleProcessor = async () => {
    if (!processorActive) {
      // Connects to the StudioEngine initHardware logic
      await engine.initHardware();
      setProcessorActive(true);
    } else {
      setProcessorActive(false);
    }
  };

  return (
    <div className="studio-control-panel p-6 bg-gray-900 text-white rounded-xl shadow-lg border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Studio Control Panel</h2>
        <span className={`px-2 py-1 text-xs rounded ${processorActive ? 'bg-green-600' : 'bg-red-600'}`}>
          {processorActive ? "ENGINE ONLINE" : "ENGINE STANDBY"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={toggleProcessor}
          className={`w-full py-3 rounded-lg font-semibold ${processorActive ? 'bg-red-600' : 'bg-green-600'}`}
        >
          {processorActive ? "FORCE STOP" : "ENGAGE ENGINE"}
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-xs text-gray-400 uppercase mb-2">Filters</h3>
        <div className="flex space-x-2">
          {["Standard", "Cinema", "Noir"].map((filter) => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded text-sm border ${activeFilter === filter ? 'border-orange-500 text-orange-400' : 'border-gray-600'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-6 text-xs text-gray-500 font-mono">
        STATUS: {processorActive ? "ACTIVE_STREAM" : "READY"} | FPS: {fps}
      </div>
    </div>
  );
}