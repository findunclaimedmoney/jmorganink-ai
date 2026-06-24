import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scene1 } from "./video/video_scenes/Scene1";
import { Scene2 } from "./video/video_scenes/Scene2";
import { Scene3 } from "./video/video_scenes/Scene3";
import { Scene4 } from "./video/video_scenes/Scene4";
import { Scene5 } from "./video/video_scenes/Scene5";

const SCENE_DURATIONS = [6000, 10000, 8000, 10000, 10000];

const bgPositions = [
  'radial-gradient(circle at 50% 50%, rgba(6,24,38,1) 0%, rgba(0,0,0,1) 100%)',
  'radial-gradient(circle at 80% 20%, rgba(11,42,61,1) 0%, rgba(6,24,38,1) 100%)',
  'radial-gradient(circle at 20% 80%, rgba(0,193,213,0.15) 0%, rgba(6,24,38,1) 100%)',
  'radial-gradient(circle at 50% 50%, rgba(0,193,213,0.1) 0%, rgba(6,24,38,1) 100%)',
  'radial-gradient(circle at 50% 100%, rgba(245,185,66,0.15) 0%, rgba(6,24,38,1) 100%)',
];


interface Props {
  onDone: () => void;
}

export default function VideoSplash({ onDone }: Props) {
  const [currentScene, setCurrentScene] = useState(0);
  const [exiting, setExiting] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const a = new Audio("/mia-splash.mp3");
    a.preload = "auto";
    audio.current = a;

    const playScene = (index: number) => {
      setCurrentScene(index);
      if (index === 0) a.play().catch(() => {});
      sceneTimer.current = setTimeout(() => {
        if (index + 1 >= SCENE_DURATIONS.length) {
          handleDone();
        } else {
          playScene(index + 1);
        }
      }, SCENE_DURATIONS[index]);
    };

    playScene(0);

    return () => {
      if (sceneTimer.current) clearTimeout(sceneTimer.current);
      a.pause();
      a.currentTime = 0;
    };
  }, []);

  function handleDone() {
    if (sceneTimer.current) clearTimeout(sceneTimer.current);
    if (audio.current) { audio.current.pause(); audio.current.currentTime = 0; }
    setExiting(true);
    setTimeout(onDone, 700);
  }

  const totalDuration = SCENE_DURATIONS.reduce((a, b) => a + b, 0);
  const elapsed = SCENE_DURATIONS.slice(0, currentScene).reduce((a, b) => a + b, 0);
  const progress = Math.round((elapsed / totalDuration) * 100);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[999] bg-[#061826] text-white overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          <div className="relative w-full h-full">
              <motion.div
                className="absolute inset-0 z-0"
                animate={{ background: bgPositions[currentScene] }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />

              <motion.div
                className="absolute rounded-full mix-blend-screen filter blur-[80px] z-0"
                animate={{
                  x: ['-20vw','10vw','60vw','40vw','50vw'][currentScene],
                  y: ['-20vh','40vh','10vh','60vh','50vh'][currentScene],
                  width: ['60vw','70vw','50vw','80vw','40vw'][currentScene],
                  height: ['60vw','70vw','50vw','80vw','40vw'][currentScene],
                  backgroundColor: currentScene >= 2 ? 'rgba(0,193,213,0.15)' : 'rgba(245,185,66,0.08)',
                }}
                transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: 'translate(-50%, -50%)' }}
              />

              <AnimatePresence mode="popLayout">
                {currentScene === 0 && <Scene1 key="s1" />}
                {currentScene === 1 && <Scene2 key="s2" />}
                {currentScene === 2 && <Scene3 key="s3" />}
                {currentScene === 3 && <Scene4 key="s4" />}
                {currentScene === 4 && <Scene5 key="s5" />}
              </AnimatePresence>

              <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center pb-8 gap-4">
                <div className="w-[80vw] max-w-md h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#00C1D5] rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-white/30 text-xs tracking-wide">Skip here to go to the homepage</p>
                  <button
                    onClick={handleDone}
                    className="text-xs text-white/40 hover:text-white/80 transition-colors tracking-widest uppercase border border-white/20 hover:border-white/50 rounded-full px-5 py-2"
                  >
                    Skip ▶
                  </button>
                </div>
              </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
