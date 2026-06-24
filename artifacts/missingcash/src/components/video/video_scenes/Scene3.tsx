import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 7000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="absolute inset-0 bg-[#00C1D5] mix-blend-overlay"
        initial={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
        animate={phase >= 1 ? { opacity: 0.15, clipPath: 'circle(100% at 50% 50%)' } : {}}
        transition={{ duration: 1.5, ease: "circOut" }}
      />

      <div className="text-center relative z-20">
        <motion.div
          className="inline-block py-3 px-8 border border-[#00C1D5]/50 bg-[#00C1D5]/10 rounded-full mb-12 shadow-[0_0_30px_rgba(0,193,213,0.3)]"
          initial={{ y: 50, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className="text-[1.5vw] font-bold text-[#00C1D5] uppercase tracking-widest">
            Path 2: The Smart Way
          </span>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotateX: 20 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1, rotateX: 0 } : {}}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{ perspective: 1000 }}
        >
          <h2 className="text-[7vw] font-heading font-black text-white leading-none">
            Meet <span className="text-[#00C1D5]">Mia</span>
          </h2>
        </motion.div>

        <motion.p 
          className="text-[2.5vw] font-sans font-light text-white mt-8"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 3 ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[#00C1D5] font-bold">No find, no fee</span> — free to start
        </motion.p>
      </div>

      {/* Abstract AI rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-[#00C1D5]/30"
            style={{ width: `${i * 30}vw`, height: `${i * 30}vw`, left: `-${i * 15}vw`, top: `-${i * 15}vw` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={phase >= 2 ? { scale: 1, opacity: 1, rotateZ: 360 } : {}}
            transition={{ 
              scale: { duration: 1.5, ease: "easeOut", delay: i * 0.2 },
              opacity: { duration: 1, delay: i * 0.2 },
              rotateZ: { duration: 20, repeat: Infinity, ease: "linear" }
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
