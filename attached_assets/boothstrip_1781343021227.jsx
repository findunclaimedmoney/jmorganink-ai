/* Powered by LensFlow | Architect: Gemini AI */
import React, { useState } from 'react';
import { useStudio } from '@/studio/StudioContext';

export default function BoothStripPage() {
  const engine = useStudio();
  const [isRecording, setIsRecording] = useState(false);

  // The Powerhouse integration: This triggers the engine directly
  const handleStartRecording = async () => {
    try {
      await engine.initHardware();
      engine.record();
      setIsRecording(true);
      console.log("BoothStrip: Engine recording started");
    } catch (err) {
      console.error("BoothStrip: Engine failed to start", err);
    }
  };

  const handleStopRecording = async () => {
    const videoUrl = await engine.stopAndSave();
    setIsRecording(false);
    console.log("BoothStrip: Engine recording saved", videoUrl);
    // Add logic here to display or handle the video URL
  };

  return (
    <div className="booth-container">
      <h1>LensFlow Booth</h1>
      
      <div className="controls">
        {!isRecording ? (
          <button onClick={handleStartRecording}>Start Capture</button>
        ) : (
          <button onClick={handleStopRecording}>Stop & Save</button>
        )}
      </div>

      {/* Your existing UI layout remains untouched below */}
      <div className="preview-area">
        {/* Booth content goes here */}
      </div>
    </div>
  );
}