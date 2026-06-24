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

const NARRATION = [
  "Did you know Australians have over 2.6 billion dollars in unclaimed money? Banks, the ATO, and ASIC are holding it right now — and some of it could be yours.",
  "The hard way: manually scroll through hundreds of pages on MoneySmart. Then search the ATO. Then every state register. Hours of work — and most people give up before they find anything.",
  "Or try the Mia way. Submit your name and details — Mia automatically searches every Australian database for you. And it's completely free to start.",
  "Mia scans MoneySmart, the ATO, all 8 state registers, Computershare, Fair Work, and more. If she finds money in your name, you only pay a small percentage. No find, no fee.",
  "Visit MissingCash dot com dot au. Search your name for free right now. Your missing cash is waiting — let Mia find it for you.",
];

async function fetchAudio(text: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch("/api/mia/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    return audio;
  } catch {
    return null;
  }
}

interface Props {
  onDone: () => void;
}

export default function VideoSplash({ onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);
  const [exiting, setExiting] = useState(false);
  const audioClips = useRef<(HTMLAudioElement | null)[]>([]);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clips: (HTMLAudioElement | null)[] = [];
      for (let i = 0; i < NARRATION.length; i++) {
        if (cancelled) return;
        const audio = await fetchAudio(NARRATION[i]!);
        clips.push(audio);
        setLoadingProgress(Math.round(((i + 1) / NARRATION.length) * 100));
      }
      if (!cancelled) {
        audioClips.current = clips;
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loading) return;

    const playScene = (index: number) => {
      setCurrentScene(index);

      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current.currentTime = 0;
      }
      const clip = audioClips.current[index];
      if (clip) {
        clip.currentTime = 0;
        clip.play().catch(() => {});
        currentAudio.current = clip;
      }

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
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current.currentTime = 0;
      }
    };
  }, [loading]);

  function handleDone() {
    if (sceneTimer.current) clearTimeout(sceneTimer.current);
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
    }
    setExiting(true);
    setTimeout(onDone, 700);
  }

  const totalDuration = SCENE_DURATIONS.reduce((a, b) => a + b, 0);
  const elapsed = SCENE_DURATIONS.slice(0, currentScene).reduce((a, b) => a + b, 0);
  const progress = loading ? 0 : Math.round((elapsed / totalDuration) * 100);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[999] bg-[#061826] text-white overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-[#00C1D5]/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-4 border-[#00C1D5]/40 animate-pulse" />
                <div className="relative rounded-full bg-[#00C1D5]/10 border-2 border-[#00C1D5] w-16 h-16 flex items-center justify-center mx-auto mt-1">
                  <span className="text-[#00C1D5] text-2xl">♪</span>
                </div>
              </div>
              <p className="text-white font-heading tracking-widest text-lg mb-4">LOADING…</p>
              <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#00C1D5] rounded-full"
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <button
                onClick={handleDone}
                className="mt-10 text-xs text-white/30 hover:text-white/60 transition-colors underline"
              >
                Skip intro
              </button>
            </div>
          ) : (
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
